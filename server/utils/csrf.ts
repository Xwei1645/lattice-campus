import crypto from 'crypto'
import { H3Event } from 'h3'

const CSRF_COOKIE_NAME = 'csrf_token'
const CSRF_HEADER_NAME = 'x-csrf-token'
const CSRF_TOKEN_LENGTH = 32
const CSRF_COOKIE_MAX_AGE = 60 * 60 * 24
const CSRF_COOKIE_SAMESITE = 'lax' as const

export interface CsrfCookieOptions {
    httpOnly: false
    secure: boolean
    sameSite: 'lax'
    maxAge: number
    path: '/'
}

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

    // 长度不一致时 timingSafeEqual 会抛异常，先快速拒绝
    if (cookieToken.length !== headerToken.length) {
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

/**
 * 校验token长度是否符合预期
 */
export function isValidCsrfTokenLength(token: string): boolean {
    return token.length === CSRF_TOKEN_LENGTH * 2
}

/**
 * 计算 cookie secure 标志
 */
export function shouldUseSecureCookie(event: H3Event): boolean {
    const protoHeader = (getHeader(event, 'x-forwarded-proto') || '').split(',')[0]?.trim().toLowerCase()
    const isHttps = protoHeader === 'https' || Boolean((event.node.req.socket as any)?.encrypted)
    return isHttps
}

/**
 * 获取统一的CSRF Cookie选项
 */
export function getCsrfCookieOptions(event: H3Event): CsrfCookieOptions {
    return {
        httpOnly: false,
        secure: shouldUseSecureCookie(event),
        sameSite: CSRF_COOKIE_SAMESITE,
        maxAge: CSRF_COOKIE_MAX_AGE,
        path: '/'
    }
}

/**
 * 校验请求源（Origin / Referer）
 */
export function isRequestOriginValid(event: H3Event): boolean {
    const origin = getHeader(event, 'origin') || ''
    const referer = getHeader(event, 'referer') || ''
    const requestOrigin = getRequestOrigin(event)

    if (origin && origin !== requestOrigin) {
        return false
    }

    const refererOrigin = extractOriginFromReferer(referer)
    if (refererOrigin && refererOrigin !== requestOrigin) {
        return false
    }

    return true
}

function getRequestOrigin(event: H3Event): string {
    const protoHeader = (getHeader(event, 'x-forwarded-proto') || '').split(',')[0]?.trim().toLowerCase()
    const proto = protoHeader || ((event.node.req.socket as any)?.encrypted ? 'https' : 'http')
    const host = getHeader(event, 'x-forwarded-host') || getHeader(event, 'host') || ''
    return `${proto}://${host}`
}

function extractOriginFromReferer(referer: string): string {
    if (!referer) {
        return ''
    }

    try {
        const parsed = new URL(referer)
        return parsed.origin
    } catch {
        return ''
    }
}
