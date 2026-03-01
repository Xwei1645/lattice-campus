/**
 * CSRF Token 自动注入插件
 * 拦截所有非 GET 请求，自动添加 CSRF token 到请求头
 */

const CSRF_COOKIE_NAME = 'csrf_token'
const CSRF_HEADER_NAME = 'x-csrf-token'

export default defineNuxtPlugin({
    name: 'csrf',
    enforce: 'pre',
    async setup() {
        // 仅在客户端执行
        if (import.meta.server) {
            return
        }

        // 页面加载时确保 CSRF token 已存在
        await ensureCsrfToken()

        // 使用 ofetch 的全局拦截器
        const originalFetch = globalThis.$fetch

        // 重写全局 $fetch
        globalThis.$fetch = createCsrfFetch(
            originalFetch,
            getCsrfToken,
            getCsrfHeaderName
        ) as typeof $fetch
    }
})

/**
 * 创建带 CSRF token 注入的 fetch 包装器
 * @param originalFetch 原始 fetch 方法
 * @returns 包装后的 fetch 方法
 */
function createCsrfFetch(
    originalFetch: typeof $fetch,
    getCsrfToken: () => string,
    getCsrfHeaderName: () => string
) {
    return async (url: string, options?: any) => {
        options = options || {}

        // 获取请求方法，默认为 GET
        const method = options?.method?.toUpperCase() || 'GET'
        
        // 仅对非安全方法添加 CSRF token
        if (!isSafeMethod(method)) {
            let token = getCsrfToken()

            // 首次请求若还没有 token，先尝试获取
            if (!token) {
                await refreshCsrfToken(originalFetch)
                token = getCsrfToken()
            }
            
            if (token) {
                const headers = normalizeHeaders(options.headers)
                
                // 添加 CSRF token 到请求头
                options.headers = {
                    ...headers,
                    [getCsrfHeaderName()]: token
                }
            }
        }
        
        try {
            return await originalFetch(url, options)
        } catch (error: any) {
            // CSRF 校验失败时，刷新 token 并重试一次
            if (!isSafeMethod(method) && error?.status === 403) {
                const message = String(error?.data?.message || error?.statusMessage || '')
                if (message.includes('CSRF')) {
                    await refreshCsrfToken(originalFetch)
                    const retryToken = getCsrfToken()
                    if (retryToken) {
                        const headers = normalizeHeaders(options.headers)
                        options.headers = {
                            ...headers,
                            [getCsrfHeaderName()]: retryToken
                        }
                        return originalFetch(url, options)
                    }
                }
            }

            throw error
        }
    }
}

function getCsrfHeaderName(): string {
    return CSRF_HEADER_NAME
}

function getCsrfToken(): string {
    const cookies = document.cookie.split(';')

    for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=')
        if (name === CSRF_COOKIE_NAME) {
            return decodeURIComponent(value || '')
        }
    }

    return ''
}

async function ensureCsrfToken(): Promise<void> {
    const existingToken = getCsrfToken()
    if (existingToken) {
        return
    }

    await refreshCsrfToken(globalThis.$fetch)
}

async function refreshCsrfToken(originalFetch: typeof $fetch): Promise<void> {
    try {
        await originalFetch('/api/csrf-token', {
            method: 'GET',
            credentials: 'same-origin'
        })
    } catch {
        // 交由上层请求处理错误
    }
}

/**
 * 标准化 headers 为普通对象
 * @param headers 原始 headers
 * @returns 标准化后的 headers 对象
 */
function normalizeHeaders(
    headers: Record<string, any> | Headers | undefined
): Record<string, string> {
    if (!headers) {
        return {}
    }
    
    if (headers instanceof Headers) {
        const result: Record<string, string> = {}
        headers.forEach((value, key) => {
            result[key] = value
        })
        return result
    }
    
    return { ...headers }
}

/**
 * 判断是否为安全方法（不需要 CSRF 保护）
 * @param method HTTP 方法
 * @returns 是否为安全方法
 */
function isSafeMethod(method: string): boolean {
    const safeMethods = ['GET', 'HEAD', 'OPTIONS']
    return safeMethods.includes(method.toUpperCase())
}

