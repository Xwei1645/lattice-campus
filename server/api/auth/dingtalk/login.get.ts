import { dingtalk } from '../../../utils/dingtalk'
import crypto from 'crypto'

// 签名密钥（应该从环境变量获取）
const STATE_SIGN_SECRET = process.env.STATE_SIGN_SECRET || 
    'default-secret-change-in-production'

// 生成密码学安全的随机 state 字符串
function generateState(): string {
    return crypto.randomBytes(32).toString('hex')
}

/**
 * 对state数据进行签名
 * 防止参数被篡改
 */
function signState(data: string): string {
    const hmac = crypto.createHmac('sha256', STATE_SIGN_SECRET)
    hmac.update(data)
    return hmac.digest('hex').substring(0, 16) // 取前16位
}

/**
 * 创建带签名的绑定状态
 */
function createBindState(userId: string, randomState: string): string {
    const data = `${userId}:${randomState}`
    const signature = signState(data)
    return `bind_${userId}_${randomState}_${signature}`
}

/**
 * 验证绑定状态签名
 */
export function verifyBindState(state: string): { 
    valid: boolean
    userId?: string 
    randomState?: string 
} {
    const parts = state.split('_')
    
    // 格式: bind_userId_randomState_signature
    if (parts.length !== 4 || parts[0] !== 'bind') {
        return { valid: false }
    }

    const [, userId, randomState, signature] = parts
    
    // 验证签名
    const expectedSignature = signState(`${userId}:${randomState}`)
    
    if (signature !== expectedSignature) {
        return { valid: false }
    }

    return { 
        valid: true, 
        userId, 
        randomState 
    }
}

export default defineEventHandler(async (event) => {
    const query = getQuery(event)
    const isIframeMode = query.iframe === 'true'
    const useBridge = query.bridge === 'true'
    const bindMode = query.bind === 'true'
    const redirect = query.redirect === 'true'

    // 生成随机 state 并存储在 cookie 中（用于 CSRF 防护）
    const randomState = generateState()
    setCookie(event, 'dingtalk_state', randomState, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600, // 10分钟有效期
        path: '/'
    })

    // 如果是绑定模式，使用签名保护state参数
    let finalState: string
    const bindUserId = query.bindUserId as string
    
    if (bindMode && bindUserId) {
        // 验证bindUserId格式（必须是数字）
        if (!/^\d+$/.test(bindUserId)) {
            throw createError({
                statusCode: 400,
                statusMessage: '无效的用户ID'
            })
        }
        
        // 创建带签名的绑定状态
        finalState = createBindState(bindUserId, randomState)
    } else {
        finalState = randomState
    }

    // 构建回调地址
    let customRedirectUri: string | undefined
    // 从请求头获取实际的主机地址
    const requestHost = getRequestHeader(event, 'host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const host = process.env.NODE_ENV === 'production'
        ? (process.env.APP_URL || `${protocol}://${requestHost}`)
        : `${protocol}://${requestHost}`

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
