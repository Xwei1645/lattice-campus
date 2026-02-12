import { db } from '../../../utils/prisma'
import { requireAdmin } from '../../../utils/auth'
import { sendSuccess, handleError } from '../../../utils/api'

/**
 * 审核拒绝API
 * 删除待审核的老师记录
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

        // 检查老师状态是否为pending
        if (teacher.status !== 'pending') {
            throw createError({
                statusCode: 400,
                statusMessage: '只能拒绝状态为待审核的老师'
            })
        }

        // 删除老师记录（关联数据会通过onDelete: Cascade自动删除）
        await db.teacher.delete({
            where: { id: teacherId }
        })

        return sendSuccess(event, null, '已拒绝该老师申请，记录已删除')
    } catch (error) {
        return handleError(error)
    }
})
