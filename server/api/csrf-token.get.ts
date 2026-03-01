import { 
    generateCsrfToken,
    getCsrfCookieName,
    isValidCsrfTokenLength,
    getCsrfCookieOptions
} from '../utils/csrf'

/**
 * 获取CSRF Token
 * 前端调用此接口获取CSRF Token用于后续请求
 */
export default defineEventHandler(async (event) => {
    // 检查是否已有token
    let token = getCookie(event, getCsrfCookieName())
    
    // 如果没有token，生成新的
    if (!token || !isValidCsrfTokenLength(token)) {
        token = generateCsrfToken()
        setCookie(event, getCsrfCookieName(), token, getCsrfCookieOptions(event))
    }

    return {
        success: true,
        token
    }
})
