/**
 * CSRF Token 处理 Composable
 * 提供从 cookie 中读取 CSRF token 和生成请求头的功能
 */

// CSRF cookie 名称（与后端保持一致）
const CSRF_COOKIE_NAME = 'csrf_token'

// CSRF header 名称（与后端保持一致）
const CSRF_HEADER_NAME = 'x-csrf-token'

/**
 * 从 cookie 中读取 CSRF token
 * @returns CSRF token 字符串，如果不存在则返回空字符串
 */
export function getCsrfToken(): string {
    if (import.meta.server) {
        return ''
    }

    // 解析 cookie 字符串
    const cookies = document.cookie.split(';')
    
    for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=')
        if (name === CSRF_COOKIE_NAME) {
            return decodeURIComponent(value || '')
        }
    }
    
    return ''
}

/**
 * 获取包含 CSRF token 的请求头对象
 * @returns 包含 x-csrf-token 的 headers 对象
 */
export function getCsrfHeaders(): Record<string, string> {
    const token = getCsrfToken()
    
    if (!token) {
        return {}
    }
    
    return {
        [CSRF_HEADER_NAME]: token
    }
}

/**
 * 确保 CSRF token 已存在
 * 如果 cookie 中没有 token，则调用后端接口获取
 */
export async function ensureCsrfToken(): Promise<void> {
    if (import.meta.server) {
        return
    }

    const existingToken = getCsrfToken()
    
    // 如果已有 token，无需重新获取
    if (existingToken) {
        return
    }
    
    try {
        // 调用后端接口获取 CSRF token
        await $fetch('/api/csrf-token', {
            method: 'GET'
        })
    } catch (error) {
        console.error('获取 CSRF token 失败:', error)
    }
}
