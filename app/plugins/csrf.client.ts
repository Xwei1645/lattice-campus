/**
 * CSRF Token 自动注入插件
 * 拦截所有非 GET 请求，自动添加 CSRF token 到请求头
 */

export default defineNuxtPlugin({
    name: 'csrf',
    enforce: 'pre',
    async setup() {
        // 仅在客户端执行
        if (import.meta.server) {
            return
        }

        // 页面加载时确保 CSRF token 已存在
        const { ensureCsrfToken } = await import(
            '~/composables/useCsrf'
        )
        await ensureCsrfToken()

        // 使用 ofetch 的全局拦截器
        const originalFetch = globalThis.$fetch

        // 重写全局 $fetch
        globalThis.$fetch = createCsrfFetch(originalFetch) as typeof $fetch
    }
})

/**
 * 创建带 CSRF token 注入的 fetch 包装器
 * @param originalFetch 原始 fetch 方法
 * @returns 包装后的 fetch 方法
 */
function createCsrfFetch(
    originalFetch: typeof $fetch
) {
    return async (url: string, options?: any) => {
        // 获取请求方法，默认为 GET
        const method = options?.method?.toUpperCase() || 'GET'
        
        // 仅对非安全方法添加 CSRF token
        if (!isSafeMethod(method)) {
            // 获取 CSRF token
            const token = getCsrfToken()
            
            if (token) {
                // 确保 options 和 headers 存在
                options = options || {}
                const headers = normalizeHeaders(options.headers)
                
                // 添加 CSRF token 到请求头
                options.headers = {
                    ...headers,
                    'x-csrf-token': token
                }
            }
        }
        
        // 调用原始的 fetch 方法
        return originalFetch(url, options)
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

/**
 * 从 cookie 中读取 CSRF token
 * @returns CSRF token 字符串
 */
function getCsrfToken(): string {
    const cookies = document.cookie.split(';')
    
    for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=')
        if (name === 'csrf_token') {
            return decodeURIComponent(value || '')
        }
    }
    
    return ''
}
