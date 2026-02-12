import { db } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'
import { sendSuccess, handleError } from '../../utils/api'

/**
 * 删除学生API
 * 删除学生及其关联数据
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

        // 删除学生（关联数据会通过onDelete: Cascade自动删除）
        // 包括：StudentSession, Booking等
        await db.student.delete({
            where: { id: studentId }
        })

        return sendSuccess(event, null, '学生已成功删除')
    } catch (error) {
        return handleError(error)
    }
})
