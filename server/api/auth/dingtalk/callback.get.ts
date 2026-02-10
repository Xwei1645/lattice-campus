import { db } from '../../../utils/prisma'
import { createSession, setSessionCookie } from '../../../utils/auth'
import { dingtalk, type DingTalkUser } from '../../../utils/dingtalk'

export default defineEventHandler(async (event) => {
    const query = getQuery(event)
    const code = query.authCode as string

    if (!code) {
        return sendRedirect(event, '/login?error=dingtalk_code_missing')
    }

    try {
        // 1. 获取钉钉用户信息
        const dingInfo: DingTalkUser = await dingtalk.getUserInfoByCode(code)

        // 2. 根据 dingTalkOpenId 查找系统用户
        const user = await db.user.findUnique({
            where: {
                dingTalkOpenId: dingInfo.openId
            }
        })

        if (!user) {
            // 如果找不到用户，跳转到登录页并提示绑定
            return sendRedirect(event, `/login?error=dingtalk_user_not_found&dingName=${encodeURIComponent(dingInfo.name)}`)
        }

        if (!user.status) {
            return sendRedirect(event, '/login?error=account_disabled')
        }

        // 3. 登录逻辑：创建 Session
        const sessionToken = await createSession(user.id)
        setSessionCookie(event, sessionToken)

        // 4. 跳转至首页
        return sendRedirect(event, '/')
    } catch (error) {
        console.error('[DingTalk Callback Error]:', error)
        return sendRedirect(event, '/login?error=dingtalk_auth_failed')
    }
})
