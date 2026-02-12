import { db } from '../../../utils/prisma'
import { requireAdmin } from '../../../utils/auth'
import { sendSuccess, handleError } from '../../../utils/api'

/**
 * 解绑钉钉API
 * 清空老师的dingTalkOpenId字段
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
        if (!teacher.dingTalkOpenId) {
            throw createError({
                statusCode: 400,
                statusMessage: '该老师未绑定钉钉账号'
            })
        }

        // 清空dingTalkOpenId字段
        await db.teacher.update({
            where: { id: teacherId },
            data: { dingTalkOpenId: null }
        })

        return sendSuccess(event, null, '解绑钉钉成功')
    } catch (error) {
        return handleError(error)
    }
})
