import { db } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'
import { sendSuccess, handleError } from '../../utils/api'

/**
 * 删除老师API
 * 删除老师及其关联数据
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

        // 删除老师（关联数据会通过onDelete: Cascade自动删除）
        // 包括：TeacherSession, TeacherOrganization, Booking等
        await db.teacher.delete({
            where: { id: teacherId }
        })

        return sendSuccess(event, null, '老师已成功删除')
    } catch (error) {
        return handleError(error)
    }
})
