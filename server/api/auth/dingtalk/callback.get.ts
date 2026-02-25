import { db } from '../../../utils/prisma'
import { 
    createSession, 
    setSessionCookie, 
    createTeacherSession, 
    setTeacherSessionCookie,
    createInitToken,
    getAuthUser
} from '../../../utils/auth'
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
    let isBindMode = false
    let bindUserId: string | null = null
    
    if (state.startsWith('bind_')) {
        const parts = state.split('_')
        if (parts.length >= 3) {
            isBindMode = true
            bindUserId = parts[1]
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

        // 绑定模式：绑定钉钉到指定用户
        if (isBindMode && bindUserId) {
            return await handleBindMode(event, dingInfo, bindUserId, isIframeMode, isBridgeMode)
        }

        // 登录模式：按 User -> Teacher 顺序查找账户
        // 1. 先检查是否为管理员（User表）
        const user = await db.user.findUnique({
            where: { dingTalkOpenId: dingInfo.openId },
            include: {
                organizations: {
                    select: { id: true, name: true }
                }
            }
        })

        if (user) {
            // 以管理员身份登录
            if (!user.status) {
                if (isIframeMode || isBridgeMode) {
                    return sendJson(event, {
                        success: false,
                        error: 'account_disabled',
                        message: '该账号已被禁用'
                    })
                }
                return sendRedirect(event, '/login?error=account_disabled')
            }

            const sessionToken = await createSession(user.id)
            setSessionCookie(event, sessionToken)

            if (isIframeMode || isBridgeMode) {
                return sendJson(event, {
                    success: true,
                    userType: 'user',
                    user: {
                        id: user.id,
                        account: user.account,
                        name: user.name,
                        role: user.role,
                        organizations: user.organizations
                    }
                })
            }

            return sendRedirect(event, '/')
        }

        // 2. 检查是否为老师（Teacher表）
        const teacher = await db.teacher.findUnique({
            where: { dingTalkOpenId: dingInfo.openId },
            include: {
                organizations: {
                    include: {
                        organization: {
                            select: { id: true, name: true }
                        }
                    }
                }
            }
        })

        if (teacher) {
            // 检查老师状态
            if (teacher.status === 'pending') {
                if (isIframeMode || isBridgeMode) {
                    return sendJson(event, {
                        success: false,
                        error: 'teacher_pending',
                        message: '您的账号正在等待管理员审核'
                    })
                }
                return sendRedirect(event, '/teacher-pending')
            }

            if (teacher.status === 'disabled') {
                if (isIframeMode || isBridgeMode) {
                    return sendJson(event, {
                        success: false,
                        error: 'account_disabled',
                        message: '该账号已被禁用'
                    })
                }
                return sendRedirect(event, '/login?error=account_disabled')
            }

            // 老师登录成功
            const sessionToken = await createTeacherSession(teacher.id)
            setTeacherSessionCookie(event, sessionToken)

            if (isIframeMode || isBridgeMode) {
                return sendJson(event, {
                    success: true,
                    userType: 'teacher',
                    user: {
                        id: teacher.id,
                        name: teacher.name,
                        organizations: teacher.organizations.map(to => ({
                            id: to.organization.id,
                            name: to.organization.name
                        }))
                    }
                })
            }

            return sendRedirect(event, '/')
        }

        // 3. 未绑定任何账户，跳转到老师初始化页面
        const initToken = createInitToken(dingInfo.openId, 'teacher')
        const nameParam = dingInfo.name 
            ? `&name=${encodeURIComponent(dingInfo.name)}` 
            : ''
        
        if (isIframeMode || isBridgeMode) {
            return sendJson(event, {
                success: false,
                error: 'teacher_init_required',
                message: '请完善老师信息',
                initToken,
                initUrl: `/teacher-init?token=${initToken}${nameParam}`
            })
        }

        return sendRedirect(
            event, 
            `/teacher-init?token=${initToken}${nameParam}`
        )

    } catch (error) {
        console.error('[DingTalk Callback Error]:', error)

        if (isIframeMode || isBridgeMode) {
            return sendJson(event, {
                success: false,
                error: 'dingtalk_auth_failed',
                message: '钉钉登录失败，请稍后重试'
            })
        }

        return sendRedirect(event, '/login?error=dingtalk_auth_failed')
    }
})

/**
 * 处理绑定模式
 * 验证权限：超级管理员可绑定任意账户，普通管理员只能绑定自己组织内的账户
 */
async function handleBindMode(
    event: any, 
    dingInfo: DingTalkUser, 
    bindUserId: string,
    isIframeMode: boolean,
    isBridgeMode: boolean
) {
    // 获取当前操作的管理员信息
    const currentUser = await getAuthUser(event)
    if (!currentUser) {
        if (isIframeMode || isBridgeMode) {
            return sendJson(event, {
                success: false,
                error: 'unauthorized',
                message: '请先登录'
            })
        }
        return sendRedirect(event, '/login?error=unauthorized')
    }

    // 检查该钉钉是否已绑定其他账户
    const existingUser = await db.user.findUnique({
        where: { dingTalkOpenId: dingInfo.openId }
    })
    if (existingUser) {
        if (isIframeMode || isBridgeMode) {
            return sendJson(event, {
                success: false,
                error: 'dingtalk_already_bound',
                message: '该钉钉账号已绑定其他管理员账户'
            })
        }
        return sendRedirect(event, '/account-management?error=dingtalk_already_bound')
    }

    const existingTeacher = await db.teacher.findUnique({
        where: { dingTalkOpenId: dingInfo.openId }
    })
    if (existingTeacher) {
        if (isIframeMode || isBridgeMode) {
            return sendJson(event, {
                success: false,
                error: 'dingtalk_already_bound',
                message: '该钉钉账号已绑定其他老师账户'
            })
        }
        return sendRedirect(event, '/account-management?error=dingtalk_already_bound')
    }

    // 绑定到指定用户（支持User和Teacher）
    const userId = parseInt(bindUserId)
    
    // 尝试绑定到User
    const user = await db.user.findUnique({ 
        where: { id: userId },
        include: { organizations: true }
    })
    if (user) {
        // 权限验证：超级管理员可绑定任意用户，普通管理员只能绑定自己组织内的用户
        if (currentUser.role !== 'super_admin') {
            const hasAccess = user.organizations.some(userOrg =>
                currentUser.organizations.some(adminOrg => adminOrg.id === userOrg.id)
            )
            if (!hasAccess) {
                if (isIframeMode || isBridgeMode) {
                    return sendJson(event, {
                        success: false,
                        error: 'forbidden',
                        message: '无权绑定该用户'
                    })
                }
                return sendRedirect(event, '/account-management?error=forbidden')
            }
        }

        await db.user.update({
            where: { id: userId },
            data: { dingTalkOpenId: dingInfo.openId }
        })
        
        if (isIframeMode || isBridgeMode) {
            return sendJson(event, {
                success: true,
                message: '钉钉绑定成功'
            })
        }
        return sendRedirect(event, '/account-management?message=dingtalk_bind_success')
    }

    // 尝试绑定到Teacher
    const teacher = await db.teacher.findUnique({ 
        where: { id: userId },
        include: { 
            organizations: {
                include: { organization: true }
            }
        }
    })
    if (teacher) {
        // 权限验证：超级管理员可绑定任意老师，普通管理员只能绑定自己组织内的老师
        if (currentUser.role !== 'super_admin') {
            const teacherOrgIds = teacher.organizations.map(to => to.organization.id)
            const hasAccess = teacherOrgIds.some(orgId =>
                currentUser.organizations.some(adminOrg => adminOrg.id === orgId)
            )
            if (!hasAccess) {
                if (isIframeMode || isBridgeMode) {
                    return sendJson(event, {
                        success: false,
                        error: 'forbidden',
                        message: '无权绑定该老师'
                    })
                }
                return sendRedirect(event, '/account-management?error=forbidden')
            }
        }

        await db.teacher.update({
            where: { id: userId },
            data: { dingTalkOpenId: dingInfo.openId }
        })
        
        if (isIframeMode || isBridgeMode) {
            return sendJson(event, {
                success: true,
                message: '钉钉绑定成功'
            })
        }
        return sendRedirect(event, '/account-management?message=dingtalk_bind_success')
    }

    // 用户不存在
    if (isIframeMode || isBridgeMode) {
        return sendJson(event, {
            success: false,
            error: 'user_not_found',
            message: '用户不存在'
        })
    }
    return sendRedirect(event, '/account-management?error=user_not_found')
}

/**
 * 发送JSON响应
 */
function sendJson(event: any, data: any) {
    setResponseStatus(event, 200)
    setResponseHeaders(event, {
        'Content-Type': 'application/json'
    })
    return send(event, JSON.stringify(data))
}
