import { z } from 'zod'
import { db } from '../../../utils/prisma'
import { requireAdmin } from '../../../utils/auth'
import bcrypt from 'bcryptjs'
import { sendSuccess, handleError } from '../../../utils/api'

// 重置密码参数验证schema
const resetPasswordSchema = z.object({
    newPassword: z.string()
        .min(6, '密码至少6个字符')
        .max(20, '密码最多20个字符')
})

/**
 * 重置密码API
 * 管理员为学生重置密码
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

        const body = await readBody(event)
        const { newPassword } = resetPasswordSchema.parse(body)

        // 加密新密码
        const hashedPassword = await bcrypt.hash(newPassword, 10)

        // 更新密码
        await db.student.update({
            where: { id: studentId },
            data: { password: hashedPassword }
        })

        return sendSuccess(event, null, '密码重置成功')
    } catch (error) {
        return handleError(error)
    }
})
