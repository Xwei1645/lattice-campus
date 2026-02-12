import { seewo } from '../../../../utils/seewo'
import crypto from 'crypto'

/**
 * 生成密码学安全的随机 state 字符串
 */
function generateState(): string {
    return crypto.randomBytes(32).toString('hex')
}

/**
 * 希沃登录入口API
 * 生成随机state并存入cookie，重定向到希沃授权页面
 */
export default defineEventHandler(async (event) => {
    // 生成随机 state 并存储在 cookie 中（用于 CSRF 防护）
    const randomState = generateState()
    setCookie(event, 'seewo_state', randomState, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600, // 10分钟有效期
        path: '/'
    })

    // 生成希沃授权 URL
    const authUrl = seewo.getAuthUrl(randomState)

    // 重定向到希沃授权页面
    return sendRedirect(event, authUrl)
})
