import { dingtalk } from '../../../utils/dingtalk'
import crypto from 'crypto'

// 生成密码学安全的随机 state 字符串
function generateState(): string {
    return crypto.randomBytes(32).toString('hex')
}

export default defineEventHandler(async (event) => {
    const query = getQuery(event)
    const isIframeMode = query.iframe === 'true'
    const useBridge = query.bridge === 'true'
    const bindMode = query.bind === 'true'
    const redirect = query.redirect === 'true'

    // 生成随机 state 并存储在 cookie 中（用于 CSRF 防护）
    const state = generateState()
    setCookie(event, 'dingtalk_state', state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600, // 10分钟有效期
        path: '/'
    })

    // 如果是绑定模式，在 state 中附加用户ID信息
    const bindUserId = query.bindUserId as string
    const finalState = bindMode && bindUserId ? `bind_${bindUserId}_${state}` : state

    // 构建回调地址
    let customRedirectUri: string | undefined
    const host = process.env.NODE_ENV === 'production'
        ? (process.env.APP_URL || '')
        : 'http://localhost:3000'

    if (bindMode) {
        // 绑定模式：回调到绑定桥接页面
        customRedirectUri = `${host}/dingtalk-bind-bridge.html`
    } else if (isIframeMode || useBridge || redirect) {
        // 登录桥接模式（iframe 或小窗口）
        customRedirectUri = `${host}/dingtalk-bridge.html`
    }

    // 生成授权 URL
    const url = dingtalk.getAuthUrl(finalState, 'openid corpid', false, customRedirectUri)

    // iframe 模式下返回 JSON（用于 iframe 内嵌二维码）
    if (isIframeMode) {
        return { url }
    }

    // 绑定模式且需要重定向时，直接跳转到钉钉
    if (bindMode && redirect) {
        return sendRedirect(event, url)
    }

    // 绑定模式但不需要重定向时，返回 JSON（用于前端获取 URL 生成二维码）
    if (bindMode) {
        return { url }
    }

    // 小窗口登录模式，直接重定向到钉钉
    if (redirect) {
        return sendRedirect(event, url)
    }

    // 桥接模式下返回 JSON
    if (useBridge) {
        return { url }
    }

    // 普通模式下重定向至钉钉授权页面
    return sendRedirect(event, url)
})
