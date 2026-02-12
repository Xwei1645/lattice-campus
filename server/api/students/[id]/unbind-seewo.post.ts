import { db } from '../../../utils/prisma'
import { requireAdmin } from '../../../utils/auth'
import { sendSuccess, handleError } from '../../../utils/api'

/**
 * 解绑希沃API
 * 清空学生的seewoOpenId字段
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
        if (!student.seewoOpenId) {
            throw createError({
                statusCode: 400,
                statusMessage: '该学生未绑定希沃账号'
            })
        }

        // 清空seewoOpenId字段
        await db.student.update({
            where: { id: studentId },
            data: { seewoOpenId: null }
        })

        return sendSuccess(event, null, '解绑希沃成功')
    } catch (error) {
        return handleError(error)
    }
})
