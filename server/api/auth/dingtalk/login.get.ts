import { dingtalk } from '../../../utils/dingtalk'

export default defineEventHandler(async (event) => {
    const query = getQuery(event)
    const isIframeMode = query.iframe === 'true'
    const useBridge = query.bridge === 'true'
    const state = query.state as string || 'STATE'
    const bindMode = query.bind === 'true'
    const redirect = query.redirect === 'true'

    // 获取当前请求的 host，确保回调地址与请求来源一致
    const reqUrl = getRequestURL(event)
    const protocol = reqUrl.protocol
    const host = reqUrl.host // 包含域名和端口
    const baseUrl = `${protocol}//${host}`

    // 构建回调地址
    let customRedirectUri: string | undefined

    if (bindMode) {
        // 绑定模式：回调到绑定桥接页面
        customRedirectUri = `${baseUrl}/dingtalk-bind-bridge.html`
    } else if (isIframeMode || useBridge) {
        // 登录桥接模式
        customRedirectUri = `${baseUrl}/dingtalk-bridge.html`
    }

    // 生成授权 URL
    const url = dingtalk.getAuthUrl(state, 'openid corpid', false, customRedirectUri)

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

    // 桥接模式下返回 JSON
    if (useBridge) {
        return { url }
    }

    // 普通模式下重定向至钉钉授权页面
    return sendRedirect(event, url)
})
