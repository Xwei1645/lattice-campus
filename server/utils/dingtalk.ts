export interface DingTalkUser {
    openId: string
    name: string
    avatar?: string
    unionId?: string
    corpId?: string
}

/**
 * 钉钉 OAuth 2.0 服务工具类 (API v2)
 * 
 * 支持的登录方式：
 * 1. 钉钉扫码登录
 * 2. 钉钉账号密码登录
 * 3. 钉钉通行密钥登录
 * 
 * 钉钉授权页面会自动显示所有可用的登录方式
 */
export class DingTalkService {
    private clientId: string
    private clientSecret: string
    private host: string

    constructor() {
        this.clientId = process.env.DINGTALK_CLIENT_ID || ''
        this.clientSecret = process.env.DINGTALK_CLIENT_SECRET || ''
        this.host = process.env.NODE_ENV === 'production'
            ? (process.env.APP_URL || '')
            : 'http://localhost:3000'

        // 检查环境变量配置
        if (!this.clientId || !this.clientSecret) {
            console.warn('[DingTalk] 警告: 环境变量 DINGTALK_CLIENT_ID 或 DINGTALK_CLIENT_SECRET 未配置，钉钉登录功能将不可用')
        }
    }

    /**
     * 生成钉钉授权登录 URL
     * 
     * scope 参数说明：
     * - openid: 仅获取用户 userid
     * - openid corpid: 获取用户 id 和组织 id
     * 
     * 钉钉授权页面支持多种登录方式：
     * - 扫码登录
     * - 账号密码登录
     * - 通行密钥登录
     * 
     * @param state 状态参数
     * @param scope 授权范围
     * @param useBridge 是否使用桥接页面作为回调（用于扫码登录）
     * @param customRedirectUri 自定义回调地址（可选）
     */
    getAuthUrl(state: string = 'STATE', scope: string = 'openid corpid', useBridge: boolean = false, customRedirectUri?: string): string {
        const baseUrl = 'https://login.dingtalk.com/oauth2/auth'
        
        // 确定回调地址
        let redirectUri: string
        if (customRedirectUri) {
            redirectUri = customRedirectUri
        } else if (useBridge) {
            redirectUri = `${this.host}/dingtalk-bridge.html`
        } else {
            redirectUri = `${this.host}/api/auth/dingtalk/callback`
        }
        
        const params = new URLSearchParams({
            role: 'user',
            client_id: this.clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: scope,
            state: state,
            prompt: 'consent'
        })
        return `${baseUrl}?${params.toString()}`
    }

    /**
     * 根据 authCode 换取 AccessToken 和 OpenID
     */
    async getUserInfoByCode(authCode: string): Promise<DingTalkUser> {
        try {
            const tokenUrl = 'https://api.dingtalk.com/v1.0/oauth2/userAccessToken'
            const tokenRes = await $fetch<{ accessToken: string }>(tokenUrl, {
                method: 'POST',
                body: {
                    clientId: this.clientId,
                    clientSecret: this.clientSecret,
                    code: authCode,
                    grantType: 'authorization_code'
                }
            })

            const accessToken = tokenRes.accessToken

            const userInfoUrl = 'https://api.dingtalk.com/v1.0/contact/users/me'
            const userInfo = await $fetch<any>(userInfoUrl, {
                headers: {
                    'x-acs-dingtalk-access-token': accessToken
                }
            })

            return {
                openId: userInfo.openId || userInfo.unionId,
                name: userInfo.nick,
                avatar: userInfo.avatarUrl,
                unionId: userInfo.unionId,
                corpId: userInfo.corpId
            }
        } catch (error: any) {
            console.error('[DingTalk Error]:', error)
            throw createError({
                statusCode: 500,
                statusMessage: '钉钉授权通信失败'
            })
        }
    }
}

export const dingtalk = new DingTalkService()
