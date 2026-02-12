import { db } from '../../../utils/prisma'
import { requireAdmin } from '../../../utils/auth'
import { seewo } from '../../../utils/seewo'
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
 * 格式：bind_student_{studentId}_{randomState}_{signature}
 */
function createBindState(studentId: string, randomState: string): string {
    const data = `${studentId}:${randomState}`
    const signature = signState(data)
    return `bind_student_${studentId}_${randomState}_${signature}`
}

/**
 * 绑定希沃API
 * 生成希沃授权URL，state格式为 bind_student_{studentId}_{randomState}_{signature}
 */
export default defineEventHandler(async (event) => {
    try {
        // 验证管理员权限
        await requireAdmin(event)

        // 获取路由参数中的学生ID
        const id = getRouterParam(event, 'id')
        if (!id) {
            throw createError({
                statusCode: 400,
                statusMessage: '缺少学生ID'
            })
        }

        const studentId = parseInt(id)
        if (isNaN(studentId)) {
            throw createError({
                statusCode: 400,
                statusMessage: '无效的学生ID'
            })
        }

        // 检查学生是否存在
        const student = await db.student.findUnique({
            where: { id: studentId }
        })

        if (!student) {
            throw createError({
                statusCode: 404,
                statusMessage: '学生不存在'
            })
        }

        // 检查是否已绑定希沃
        if (student.seewoOpenId) {
            throw createError({
                statusCode: 400,
                statusMessage: '该学生已绑定希沃账号'
            })
        }

        // 生成随机state并存储在cookie中（用于CSRF防护）
        const randomState = crypto.randomBytes(32).toString('hex')
        setCookie(event, 'seewo_state', randomState, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 600, // 10分钟有效期
            path: '/'
        })

        // 创建带签名的绑定状态
        const finalState = createBindState(studentId.toString(), randomState)

        // 构建回调地址
        const host = process.env.NODE_ENV === 'production'
            ? (process.env.APP_URL || '')
            : 'http://localhost:3000'
        const customRedirectUri = `${host}/api/auth/student/seewo/bind-callback`

        // 生成希沃授权URL
        const authUrl = seewo.getAuthUrl(finalState, customRedirectUri)

        return sendSuccess(event, {
            authUrl,
            studentId: student.id,
            studentName: student.name
        }, '希沃授权链接生成成功')
    } catch (error) {
        return handleError(error)
    }
})
