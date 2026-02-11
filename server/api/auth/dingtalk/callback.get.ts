import { db } from '../../../utils/prisma'
import { createSession, setSessionCookie } from '../../../utils/auth'
import { dingtalk, type DingTalkUser } from '../../../utils/dingtalk'
import { logLogin, logLoginFailed } from '../../../utils/audit'

export default defineEventHandler(async (event) => {
    const query = getQuery(event)
    const code = query.authCode as string

    if (!code) {
        return sendRedirect(event, '/login?error=dingtalk_code_missing')
    }

    try {
        const dingInfo: DingTalkUser = await dingtalk.getUserInfoByCode(code)

        const user = await db.user.findUnique({
            where: {
                dingTalkOpenId: dingInfo.openId
            }
        })

        if (!user) {
            return sendRedirect(event, `/login?error=dingtalk_user_not_found&dingName=${encodeURIComponent(dingInfo.name)}`)
        }

        if (!user.status) {
            await logLoginFailed(event, user.account, 'Account is disabled', 'dingtalk')
            return sendRedirect(event, '/login?error=account_disabled')
        }

        const sessionToken = await createSession(user.id)
        setSessionCookie(event, sessionToken)

        await logLogin(event, {
            id: user.id,
            account: user.account,
            name: user.name,
            role: user.role,
            status: user.status,
            organizations: []
        }, 'dingtalk')

        return sendRedirect(event, '/')
    } catch (error) {
        console.error('[DingTalk Callback Error]:', error)
        await logLoginFailed(event, 'unknown', 'DingTalk authentication failed', 'dingtalk')
        return sendRedirect(event, '/login?error=dingtalk_auth_failed')
    }
})
