import { db } from '../../../utils/prisma'
import { requireAdmin } from '../../../utils/auth'
import { dingtalk } from '../../../utils/dingtalk'
import crypto from 'crypto'

// 签名密钥（应该从环境变量获取）
const STATE_SIGN_SECRET = process.env.STATE_SIGN_SECRET || 
    'default-secret-change-in-production'

/**
 * 验证绑定状态签名
 * 格式：bind_teacher_{teacherId}_{randomState}_{signature}
 */
function verifyTeacherBindState(state: string): { 
    valid: boolean
    teacherId?: string 
    randomState?: string 
} {
    const parts = state.split('_')
    
    // 格式: bind_teacher_teacherId_randomState_signature
    if (parts.length !== 5 || parts[0] !== 'bind' || parts[1] !== 'teacher') {
        return { valid: false }
    }

    const [, , teacherId, randomState, signature] = parts
    
    // 验证签名
    const hmac = crypto.createHmac('sha256', STATE_SIGN_SECRET)
    hmac.update(`${teacherId}:${randomState}`)
    const expectedSignature = hmac.digest('hex').substring(0, 16)
    
    if (signature !== expectedSignature) {
        return { valid: false }
    }

    return { 
        valid: true, 
        teacherId, 
        randomState 
    }
}

/**
 * 老师钉钉绑定回调 API
 * 用于处理管理员为老师绑定钉钉账号的流程
 */
export default defineEventHandler(async (event) => {
    try {
        // 验证管理员权限
        await requireAdmin(event)

        const query = getQuery(event)
        const code = query.code as string || query.authCode as string
        const state = query.state as string

        if (!code) {
            return {
                success: false,
                message: '授权码缺失'
            }
        }

        // 验证 state 参数（CSRF 防护）
        const savedState = getCookie(event, 'dingtalk_state')
        if (!state || !savedState) {
            return {
                success: false,
                message: '授权状态已过期，请重新绑定'
            }
        }

        // 使用签名验证绑定状态
        const bindResult = verifyTeacherBindState(state)
        
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

        const teacherId = parseInt(bindResult.teacherId!)

        // 验证通过后清除 state cookie
        deleteCookie(event, 'dingtalk_state', { path: '/' })

        if (isNaN(teacherId)) {
            return {
                success: false,
                message: '老师ID无效'
            }
        }

        // 获取钉钉用户信息
        const dingInfo = await dingtalk.getUserInfoByCode(code)

        // 检查该钉钉账号是否已被其他老师绑定
        const existingTeacher = await db.teacher.findUnique({
            where: { dingTalkOpenId: dingInfo.openId }
        })

        if (existingTeacher && existingTeacher.id !== teacherId) {
            return {
                success: false,
                message: '该钉钉账号已被其他老师绑定'
            }
        }

        // 检查目标老师是否存在
        const targetTeacher = await db.teacher.findUnique({
            where: { id: teacherId }
        })

        if (!targetTeacher) {
            return {
                success: false,
                message: '老师不存在'
            }
        }

        // 执行绑定
        await db.teacher.update({
            where: { id: teacherId },
            data: { dingTalkOpenId: dingInfo.openId }
        })

        return {
            success: true,
            message: '绑定成功',
            teacher: {
                id: targetTeacher.id,
                account: targetTeacher.account,
                name: targetTeacher.name
            }
        }
    } catch (error: any) {
        console.error('[Teacher DingTalk Bind Error]:', error.message)

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
