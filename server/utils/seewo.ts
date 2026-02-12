import crypto from 'crypto'

export interface SeewoUser {
    openId: string
    name: string
    avatar?: string
    unionId?: string
}

/**
 * 希沃开放平台 OAuth 2.0 服务工具类
 * 
 * 支持的登录方式：
 * 1. 希沃账号登录
 * 2. 希沃扫码登录
 */
export class SeewoService {
    private clientId: string
    private clientSecret: string
    private host: string
    private authUrl: string
    private tokenUrl: string
    private userInfoUrl: string

    constructor() {
        this.clientId = process.env.SEEWO_CLIENT_ID || ''
        this.clientSecret = process.env.SEEWO_CLIENT_SECRET || ''
        this.host = process.env.NODE_ENV === 'production'
            ? (process.env.APP_URL || '')
            : 'http://localhost:3000'
        
        // 希沃开放平台API地址
        this.authUrl = process.env.SEEWO_AUTH_URL || 'https://open.seewo.com/oauth2/authorize'
        this.tokenUrl = process.env.SEEWO_TOKEN_URL || 'https://open.seewo.com/oauth2/token'
        this.userInfoUrl = process.env.SEEWO_USER_INFO_URL || 'https://open.seewo.com/oauth2/userinfo'

        // 检查环境变量配置
        if (!this.clientId || !this.clientSecret) {
            console.warn('[Seewo] 警告: 环境变量 SEEWO_CLIENT_ID 或 SEEWO_CLIENT_SECRET 未配置，希沃登录功能将不可用')
        }
    }

    /**
     * 生成希沃授权登录 URL
     * 
     * @param state 状态参数（防CSRF）
     * @param customRedirectUri 自定义回调地址（可选）
     */
    getAuthUrl(state: string = 'STATE', customRedirectUri?: string): string {
        const redirectUri = customRedirectUri || `${this.host}/api/auth/student/seewo/callback`
        
        const params = new URLSearchParams({
            client_id: this.clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: 'openid profile',
            state: state
        })
        
        return `${this.authUrl}?${params.toString()}`
    }

    /**
     * 根据 authCode 换取 AccessToken
     */
    private async getAccessToken(authCode: string, redirectUri: string): Promise<string> {
        try {
            const res = await $fetch<{ access_token: string; token_type: string }>(this.tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    code: authCode,
                    client_id: this.clientId,
                    client_secret: this.clientSecret,
                    redirect_uri: redirectUri
                }).toString()
            })

            return res.access_token
        } catch (error: any) {
            console.error('[Seewo Token Error]:', error)
            throw createError({
                statusCode: 500,
                statusMessage: '希沃授权令牌获取失败'
            })
        }
    }

    /**
     * 根据 AccessToken 获取用户信息
     */
    private async getUserInfo(accessToken: string): Promise<SeewoUser> {
        try {
            const res = await $fetch<any>(this.userInfoUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            })

            return {
                openId: res.openid || res.open_id || res.sub,
                name: res.name || res.nickname || res.nick_name,
                avatar: res.avatar || res.picture,
                unionId: res.unionid || res.union_id
            }
        } catch (error: any) {
            console.error('[Seewo UserInfo Error]:', error)
            throw createError({
                statusCode: 500,
                statusMessage: '希沃用户信息获取失败'
            })
        }
    }

    /**
     * 根据 authCode 换取用户信息
     */
    async getUserInfoByCode(authCode: string, redirectUri?: string): Promise<SeewoUser> {
        const actualRedirectUri = redirectUri || `${this.host}/api/auth/student/seewo/callback`
        const accessToken = await this.getAccessToken(authCode, actualRedirectUri)
        return await this.getUserInfo(accessToken)
    }

    /**
     * 生成 State 签名（防CSRF）
     */
    signState(data: string): string {
        const secret = process.env.STATE_SECRET || 'seewo-state-secret'
        return crypto
            .createHmac('sha256', secret)
            .update(data)
            .digest('hex')
            .substring(0, 16)
    }

    /**
     * 验证 State 签名
     */
    verifyState(data: string, signature: string): boolean {
        const expected = this.signState(data)
        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expected)
        )
    }

    /**
     * 创建初始化 Token（用于首次登录）
     */
    createInitToken(openId: string, randomState: string): string {
        const data = `${openId}:${randomState}`
        const signature = this.signState(data)
        return `${openId}_${randomState}_${signature}`
    }

    /**
     * 验证初始化 Token
     */
    verifyInitToken(token: string): { openId: string; randomState: string } | null {
        const parts = token.split('_')
        if (parts.length !== 3) return null

        const [openId, randomState, signature] = parts
        const data = `${openId}:${randomState}`

        if (!this.verifyState(data, signature)) return null

        return { openId, randomState }
    }
}

export const seewo = new SeewoService()
