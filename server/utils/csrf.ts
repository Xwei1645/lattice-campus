import crypto from 'crypto'

const CSRF_COOKIE_NAME = 'csrf_token'
const CSRF_HEADER_NAME = 'x-csrf-token'
const CSRF_TOKEN_LENGTH = 32

// 不需要CSRF保护的路径
const CSRF_EXEMPT_PATHS = [
    '/api/auth/dingtalk/login',
    '/api/auth/dingtalk/callback',
    '/api/auth/dingtalk/bind-callback',
    '/api/auth/me',
    '/api/display/'
]

// 不需要CSRF保护的方法
const CSRF_SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS']

/**
 * 生成CSRF Token
 */
export function generateCsrfToken(): string {
    return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex')
}

/**
 * 获取CSRF Cookie名称
 */
export function getCsrfCookieName(): string {
    return CSRF_COOKIE_NAME
}

/**
 * 获取CSRF Header名称
 */
export function getCsrfHeaderName(): string {
    return CSRF_HEADER_NAME
}

/**
 * 检查路径是否豁免CSRF验证
 */
export function isCsrfExemptPath(path: string): boolean {
    return CSRF_EXEMPT_PATHS.some(exemptPath => 
        path.startsWith(exemptPath)
    )
}

/**
 * 检查是否为安全方法
 */
export function isSafeMethod(method: string): boolean {
    return CSRF_SAFE_METHODS.includes(method.toUpperCase())
}

/**
 * 验证CSRF Token
 */
export function validateCsrfToken(
    cookieToken: string, 
    headerToken: string
): boolean {
    if (!cookieToken || !headerToken) {
        return false
    }
    
    // 使用时间安全比较防止时序攻击
    try {
        return crypto.timingSafeEqual(
            Buffer.from(cookieToken, 'hex'),
            Buffer.from(headerToken, 'hex')
        )
    } catch {
        return false
    }
}
