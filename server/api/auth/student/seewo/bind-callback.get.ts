import { db } from '../../../../utils/prisma'
import { requireAdmin } from '../../../../utils/auth'
import { seewo } from '../../../../utils/seewo'
import crypto from 'crypto'

// 签名密钥（应该从环境变量获取）
const STATE_SIGN_SECRET = process.env.STATE_SIGN_SECRET ||
    'default-secret-change-in-production'

/**
 * 验证绑定状态签名
 */
function verifyBindState(state: string): {
    valid: boolean
    studentId?: string
    randomState?: string
} {
    const parts = state.split('_')

    // 格式: bind_student_studentId_randomState_signature
    if (parts.length !== 5 || parts[0] !== 'bind' || parts[1] !== 'student') {
        return { valid: false }
    }

    const [, , studentId, randomState, signature] = parts

    // 验证签名
    const data = `${studentId}:${randomState}`
    const hmac = crypto.createHmac('sha256', STATE_SIGN_SECRET)
    hmac.update(data)
    const expectedSignature = hmac.digest('hex').substring(0, 16)

    if (!crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    )) {
        return { valid: false }
    }

    return {
        valid: true,
        studentId,
        randomState
    }
}

/**
 * 希沃绑定回调API
 * 验证state签名，获取希沃用户信息，更新学生的seewoOpenId
 */
export default defineEventHandler(async (event) => {
    try {
        // 验证管理员权限
        await requireAdmin(event)

        const query = getQuery(event)
        const code = query.code as string
        const state = query.state as string

        if (!code) {
            return {
                success: false,
                message: '授权码缺失'
            }
        }

        // 验证 state 参数（CSRF 防护）
        const savedState = getCookie(event, 'seewo_state')
        if (!state || !savedState) {
            return {
                success: false,
                message: '授权状态已过期，请重新绑定'
            }
        }

        // 使用签名验证绑定状态
        const bindResult = verifyBindState(state)

        if (!bindResult.valid) {
            return {
                success: false,
                message: '授权状态验证失败，请重新绑定'
            }
        }

        // 验证随机state是否匹配
        if (bindResult.randomState !== savedState) {
            return {
                success: false,
                message: '授权状态验证失败，请重新绑定'
            }
        }

        const studentId = parseInt(bindResult.studentId!)

        // 验证通过后清除 state cookie
        deleteCookie(event, 'seewo_state', { path: '/' })

        if (isNaN(studentId)) {
            return {
                success: false,
                message: '学生ID无效'
            }
        }

        // 获取希沃用户信息
        const seewoInfo = await seewo.getUserInfoByCode(code)

        // 检查该希沃账号是否已被其他学生绑定
        const existingStudent = await db.student.findUnique({
            where: { seewoOpenId: seewoInfo.openId }
        })

        if (existingStudent && existingStudent.id !== studentId) {
            return {
                success: false,
                message: '该希沃账号已被其他学生绑定'
            }
        }

        // 检查目标学生是否存在
        const targetStudent = await db.student.findUnique({
            where: { id: studentId }
        })

        if (!targetStudent) {
            return {
                success: false,
                message: '学生不存在'
            }
        }

        // 执行绑定
        await db.student.update({
            where: { id: studentId },
            data: { seewoOpenId: seewoInfo.openId }
        })

        return {
            success: true,
            message: '绑定成功',
            student: {
                id: targetStudent.id,
                name: targetStudent.name,
                studentId: targetStudent.studentId
            }
        }
    } catch (error: any) {
        console.error('[Seewo Bind Error]:', error.message)

        if (error.statusCode === 401) {
            return {
                success: false,
                message: '请先登录管理员账号'
            }
        }

        if (error.statusCode === 403) {
            return {
                success: false,
                message: '无权限执行此操作'
            }
        }

        return {
            success: false,
            message: '绑定失败，请稍后重试'
        }
    }
})
