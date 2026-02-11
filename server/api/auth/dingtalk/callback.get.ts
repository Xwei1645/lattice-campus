import { db } from '../../../utils/prisma'
import { createSession, setSessionCookie } from '../../../utils/auth'
import { dingtalk, type DingTalkUser } from '../../../utils/dingtalk'

export default defineEventHandler(async (event) => {
    const query = getQuery(event)
    const code = query.authCode as string
    const isIframeMode = query.iframe === 'true'
    const isBridgeMode = query.bridge === 'true'

    if (!code) {
        if (isIframeMode || isBridgeMode) {
            setResponseStatus(event, 200)
            setResponseHeaders(event, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            })
            return send(event, JSON.stringify({ success: false, error: 'dingtalk_code_missing' }))
        }
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
            if (isIframeMode || isBridgeMode) {
                setResponseStatus(event, 200)
                setResponseHeaders(event, {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                })
                return send(event, JSON.stringify({
                    success: false,
                    error: 'dingtalk_user_not_found',
                    message: `钉钉用户 [${dingInfo.name}] 尚未绑定系统账号，请联系管理员关联 OpenID`
                }))
            }
            return sendRedirect(event, `/login?error=dingtalk_user_not_found&dingName=${encodeURIComponent(dingInfo.name)}`)
        }

        if (!user.status) {
            if (isIframeMode || isBridgeMode) {
                setResponseStatus(event, 200)
                setResponseHeaders(event, {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                })
                return send(event, JSON.stringify({
                    success: false,
                    error: 'account_disabled',
                    message: '该账号已被禁用'
                }))
            }
            return sendRedirect(event, '/login?error=account_disabled')
        }

        const sessionToken = await createSession(user.id)
        setSessionCookie(event, sessionToken)

        if (isIframeMode || isBridgeMode) {
            setResponseStatus(event, 200)
            setResponseHeaders(event, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            })
            return send(event, JSON.stringify({
                success: true,
                user: {
                    id: user.id,
                    account: user.account,
                    name: user.name,
                    role: user.role,
                    dingTalkOpenId: user.dingTalkOpenId,
                    organizations: user.organizations
                }
            }))
        }

        return sendRedirect(event, '/')
    } catch (error) {
        console.error('[DingTalk Callback Error]:', error)

        if (isIframeMode || isBridgeMode) {
            setResponseStatus(event, 200)
            setResponseHeaders(event, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            })
            return send(event, JSON.stringify({
                success: false,
                error: 'dingtalk_auth_failed',
                message: '钉钉登录失败，请稍后重试'
            }))
        }

        return sendRedirect(event, '/login?error=dingtalk_auth_failed')
    }
})
