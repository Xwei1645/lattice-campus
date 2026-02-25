import { db } from '../../../utils/prisma'
import { requireAdmin } from '../../../utils/auth'
import { sendSuccess, handleError } from '../../../utils/api'

/**
 * 审核通过API
 * 将老师status从pending改为active
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
                statusMessage: '只能审核状态为待审核的老师'
            })
        }

        // 更新老师状态为active
        const updatedTeacher = await db.teacher.update({
            where: { id: teacherId },
            data: {
                status: 'active'
            },
            include: {
                organizations: {
                    include: {
                        organization: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                }
            }
        })

        return sendSuccess(event, {
            id: updatedTeacher.id,
            name: updatedTeacher.name,
            account: updatedTeacher.account,
            status: updatedTeacher.status,
            organizations: updatedTeacher.organizations.map(to => ({
                id: to.organization.id,
                name: to.organization.name
            }))
        }, '审核通过，老师账号已激活')
    } catch (error) {
        return handleError(error)
    }
})
