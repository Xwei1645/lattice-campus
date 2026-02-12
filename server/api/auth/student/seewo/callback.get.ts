import { db } from '../../../../utils/prisma'
import {
    createStudentSession,
    setStudentSessionCookie,
    createInitToken
} from '../../../../utils/auth'
import { seewo } from '../../../../utils/seewo'

/**
 * 希沃登录回调API
 * 验证state参数，获取用户信息，处理登录或初始化流程
 */
export default defineEventHandler(async (event) => {
    const query = getQuery(event)
    const code = query.code as string
    const state = query.state as string

    // 验证 state 参数（CSRF 防护）
    const savedState = getCookie(event, 'seewo_state')
    if (!state || !savedState) {
        return sendRedirect(
            event,
            '/student-login?error=seewo_state_missing'
        )
    }

    if (state !== savedState) {
        return sendRedirect(
            event,
            '/student-login?error=seewo_state_invalid'
        )
    }

    // 验证通过后清除 state cookie
    deleteCookie(event, 'seewo_state', { path: '/' })

    if (!code) {
        return sendRedirect(
            event,
            '/student-login?error=seewo_code_missing'
        )
    }

    try {
        // 获取希沃用户信息
        const seewoInfo = await seewo.getUserInfoByCode(code)

        // 查询Student表是否存在该seewoOpenId
        const student = await db.student.findUnique({
            where: { seewoOpenId: seewoInfo.openId }
        })

        if (student) {
            // 检查学生状态
            if (student.status === 'disabled') {
                return sendRedirect(
                    event,
                    '/student-login?error=account_disabled'
                )
            }

            // 学生登录成功，创建会话
            const sessionToken = await createStudentSession(student.id)
            setStudentSessionCookie(event, sessionToken)

            // 重定向到首页
            return sendRedirect(event, '/')
        }

        // 学生不存在，生成初始化token，跳转到初始化页面
        const initToken = createInitToken(seewoInfo.openId, 'student')

        return sendRedirect(
            event,
            `/student-init?token=${initToken}&name=${encodeURIComponent(seewoInfo.name || '')}`
        )

    } catch (error) {
        console.error('[Seewo Callback Error]:', error)
        return sendRedirect(
            event,
            '/student-login?error=seewo_auth_failed'
        )
    }
})
