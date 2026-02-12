import { db } from '../../../utils/prisma'
import { requireAdmin } from '../../../utils/auth'
import { dingtalk } from '../../../utils/dingtalk'
import { sendSuccess, handleError } from '../../../utils/api'
import crypto from 'crypto'

// 签名密钥（应该从环境变量获取）
const STATE_SIGN_SECRET = process.env.STATE_SIGN_SECRET || 
    'default-secret-change-in-production'

/**
 * 对state数据进行签名
 * 防止参数被篡改
 */
function signState(data: string): string {
    const hmac = crypto.createHmac('sha256', STATE_SIGN_SECRET)
    hmac.update(data)
    return hmac.digest('hex').substring(0, 16) // 取前16位
}

/**
 * 创建带签名的绑定状态
 * 格式：bind_teacher_{teacherId}_{randomState}_{signature}
 */
function createBindState(teacherId: string, randomState: string): string {
    const data = `${teacherId}:${randomState}`
    const signature = signState(data)
    return `bind_teacher_${teacherId}_${randomState}_${signature}`
}

/**
 * 绑定钉钉API
 * 生成钉钉授权URL，state格式为 bind_teacher_{teacherId}_{randomState}_{signature}
 */
export default defineEventHandler(async (event) => {
    try {
        // 验证管理员权限
        await requireAdmin(event)

        // 获取路由参数中的老师ID
        const id = getRouterParam(event, 'id')
        if (!id) {
            throw createError({
                statusCode: 400,
                statusMessage: '缺少老师ID'
            })
        }

        const teacherId = parseInt(id)
        if (isNaN(teacherId)) {
            throw createError({
                statusCode: 400,
                statusMessage: '无效的老师ID'
            })
        }

        // 检查老师是否存在
        const teacher = await db.teacher.findUnique({
            where: { id: teacherId }
        })

        if (!teacher) {
            throw createError({
                statusCode: 404,
                statusMessage: '老师不存在'
            })
        }

        // 检查是否已绑定钉钉
        if (teacher.dingTalkOpenId) {
            throw createError({
                statusCode: 400,
                statusMessage: '该老师已绑定钉钉账号'
            })
        }

        // 生成随机state并存储在cookie中（用于CSRF防护）
        const randomState = crypto.randomBytes(32).toString('hex')
        setCookie(event, 'dingtalk_state', randomState, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 600, // 10分钟有效期
            path: '/'
        })

        // 创建带签名的绑定状态
        const finalState = createBindState(teacherId.toString(), randomState)

        // 构建回调地址
        const host = process.env.NODE_ENV === 'production'
            ? (process.env.APP_URL || '')
            : 'http://localhost:3000'
        const customRedirectUri = `${host}/dingtalk-teacher-bind-bridge.html`

        // 生成钉钉授权URL
        const authUrl = dingtalk.getAuthUrl(
            finalState, 
            'openid corpid', 
            false, 
            customRedirectUri
        )

        return sendSuccess(event, {
            authUrl,
            teacherId: teacher.id,
            teacherName: teacher.name
        }, '钉钉授权链接生成成功')
    } catch (error) {
        return handleError(error)
    }
})
