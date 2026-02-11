import { db } from '../../../utils/prisma'
import { createSession, setSessionCookie } from '../../../utils/auth'
import { dingtalk, type DingTalkUser } from '../../../utils/dingtalk'

export default defineEventHandler(async (event) => {
    const query = getQuery(event)
    const code = query.authCode as string
    const state = query.state as string
    const isIframeMode = query.iframe === 'true'
    const isBridgeMode = query.bridge === 'true'

    // 验证 state 参数（CSRF 防护）
    const savedState = getCookie(event, 'dingtalk_state')
    if (!state || !savedState) {
        const error = 'dingtalk_state_missing'
        if (isIframeMode || isBridgeMode) {
            setResponseStatus(event, 200)
            setResponseHeaders(event, {
                'Content-Type': 'application/json'
            })
            return send(event, JSON.stringify({
                success: false,
                error,
                message: '授权状态已过期，请重新登录'
            }))
        }
        return sendRedirect(event, '/login?error=dingtalk_state_missing')
    }

    // 提取实际的 state（绑定模式下 state 格式为 bind_userId_actualState）
    let actualState = state
    if (state.startsWith('bind_')) {
        const parts = state.split('_')
        if (parts.length >= 3) {
            actualState = parts.slice(2).join('_')
        }
    }

    if (actualState !== savedState) {
        const error = 'dingtalk_state_invalid'
        if (isIframeMode || isBridgeMode) {
            setResponseStatus(event, 200)
            setResponseHeaders(event, {
                'Content-Type': 'application/json'
            })
            return send(event, JSON.stringify({
                success: false,
                error,
                message: '授权状态验证失败，请重新登录'
            }))
        }
        return sendRedirect(event, '/login?error=dingtalk_state_invalid')
    }

    // 验证通过后清除 state cookie
    deleteCookie(event, 'dingtalk_state', { path: '/' })

    if (!code) {
        if (isIframeMode || isBridgeMode) {
            setResponseStatus(event, 200)
            setResponseHeaders(event, {
                'Content-Type': 'application/json'
            })
            return send(event, JSON.stringify({
                success: false,
                error: 'dingtalk_code_missing'
            }))
        }
        return sendRedirect(event, '/login?error=dingtalk_code_missing')
    }

    try {
        const dingInfo: DingTalkUser = await dingtalk.getUserInfoByCode(code)

        const user = await db.user.findUnique({
            where: {
                dingTalkOpenId: dingInfo.openId
            },
            include: {
                organizations: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        })

        if (!user) {
            if (isIframeMode || isBridgeMode) {
                setResponseStatus(event, 200)
                setResponseHeaders(event, {
                    'Content-Type': 'application/json'
                })
                return send(event, JSON.stringify({
                    success: false,
                    error: 'dingtalk_user_not_found',
                    message: '该钉钉账号尚未绑定系统账号，请联系管理员'
                }))
            }
            return sendRedirect(event, '/login?error=dingtalk_user_not_found')
        }

        if (!user.status) {
            if (isIframeMode || isBridgeMode) {
                setResponseStatus(event, 200)
                setResponseHeaders(event, {
                    'Content-Type': 'application/json'
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
                'Content-Type': 'application/json'
            })
            return send(event, JSON.stringify({
                success: true,
                user: {
                    id: user.id,
                    account: user.account,
                    name: user.name,
                    role: user.role,
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
                'Content-Type': 'application/json'
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
