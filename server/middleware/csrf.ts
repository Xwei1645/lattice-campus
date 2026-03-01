import { 
    generateCsrfToken, 
    validateCsrfToken, 
    getCsrfCookieName, 
    getCsrfHeaderName,
    isValidCsrfTokenLength,
    getCsrfCookieOptions,
    isCsrfExemptPath,
    isSafeMethod,
    isRequestOriginValid
} from '../utils/csrf'
import { createError, defineEventHandler, H3Event } from 'h3'

/**
 * CSRF保护中间件
 * 为所有非安全方法的请求验证CSRF Token
 */
export default defineEventHandler(async (event: H3Event) => {
    const method = event.method
    const path = event.path

    // 仅保护 API 路由，避免影响页面与静态资源请求
    if (!path.startsWith('/api/')) {
        return
    }

    // 跳过安全方法和豁免路径
    if (isSafeMethod(method) || isCsrfExemptPath(path)) {
        // 确保CSRF Token存在
        await ensureCsrfToken(event)
        return
    }

    // 验证CSRF Token
    const cookieToken = getCookie(event, getCsrfCookieName())
    const headerToken = getHeader(event, getCsrfHeaderName())

    if (!isRequestOriginValid(event)) {
        throw createError({
            statusCode: 403,
            statusMessage: 'CSRF Origin验证失败',
            data: {
                success: false,
                message: '请求来源非法，请刷新页面重试'
            }
        })
    }

    if (!validateCsrfToken(cookieToken || '', headerToken || '')) {
        throw createError({
            statusCode: 403,
            statusMessage: 'CSRF Token验证失败',
            data: {
                success: false,
                message: '请求验证失败，请刷新页面重试'
            }
        })
    }

    // 验证通过后刷新CSRF Token
    await ensureCsrfToken(event)
})

/**
 * 确保CSRF Token存在
 */
async function ensureCsrfToken(event: H3Event): Promise<void> {
    let token = getCookie(event, getCsrfCookieName())
    
    // 如果没有token或token格式不正确，生成新的
    if (!token || !isValidCsrfTokenLength(token)) {
        token = generateCsrfToken()
        setCookie(event, getCsrfCookieName(), token, getCsrfCookieOptions(event))
    }
}
