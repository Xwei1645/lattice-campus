export interface DingTalkUser {
    openId: string
    name: string
    avatar?: string
    unionId?: string
}

/**
 * 钉钉 OAuth 2.0 服务工具类 (API v2)
 */
export class DingTalkService {
    private clientId: string
    private clientSecret: string
    private redirectUri: string

    constructor() {
        this.clientId = process.env.DINGTALK_CLIENT_ID || ''
        this.clientSecret = process.env.DINGTALK_CLIENT_SECRET || ''

        const host = process.env.NODE_ENV === 'production'
            ? process.env.APP_URL
            : 'http://localhost:3000'
        this.redirectUri = `${host}/api/auth/dingtalk/callback`
    }

    /**
     * 生成钉钉授权登录 URL
     */
    getAuthUrl(state: string = 'STATE'): string {
        const baseUrl = 'https://login.dingtalk.com/oauth2/auth'
        const params = new URLSearchParams({
            role: 'user',
            client_id: this.clientId,
            redirect_uri: this.redirectUri,
            response_type: 'code',
            scope: 'openid corpid',
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
                unionId: userInfo.unionId
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
