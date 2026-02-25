import { generateCsrfToken, getCsrfCookieName } from '../utils/csrf'

/**
 * 获取CSRF Token
 * 前端调用此接口获取CSRF Token用于后续请求
 */
export default defineEventHandler(async (event) => {
    // 检查是否已有token
    let token = getCookie(event, getCsrfCookieName())
    
    // 如果没有token，生成新的
    if (!token || token.length !== 64) {
        token = generateCsrfToken()
        setCookie(event, getCsrfCookieName(), token, {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24,
            path: '/'
        })
    }

    return {
        success: true,
        token
    }
})
