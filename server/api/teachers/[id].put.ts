import { z } from 'zod'
import { db } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'
import { sendSuccess, handleError } from '../../utils/api'

// 更新老师参数验证schema
const teacherUpdateSchema = z.object({
    name: z.string().min(2, '姓名至少2个字符').max(20, '姓名最多20个字符'),
    account: z.string()
        .min(4, '账号至少4个字符')
        .max(20, '账号最多20个字符')
        .regex(/^[a-zA-Z0-9_]+$/, '账号只能包含字母、数字和下划线')
        .optional()
        .nullable(),
    organizationIds: z.array(z.number().int().positive())
})

/**
 * 更新老师API
 * 更新老师基本信息和部门关联
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
        const existingTeacher = await db.teacher.findUnique({
            where: { id: teacherId }
        })

        if (!existingTeacher) {
            throw createError({
                statusCode: 404,
                statusMessage: '老师不存在'
            })
        }

        const body = await readBody(event)
        const validatedData = teacherUpdateSchema.parse(body)
        const { name, account, organizationIds } = validatedData

        // 如果提供了账号，检查账号是否已被其他老师使用
        if (account && account !== existingTeacher.account) {
            const accountOwner = await db.teacher.findUnique({
                where: { account }
            })
            if (accountOwner) {
                throw createError({
                    statusCode: 400,
                    statusMessage: '该账号已被其他老师使用'
                })
            }
        }

        // 更新老师信息
        const teacher = await db.teacher.update({
            where: { id: teacherId },
            data: {
                name,
                account: account || null,
                organizations: {
                    // 先删除所有旧的关联，再创建新的关联
                    deleteMany: {},
                    create: organizationIds.map((orgId: number) => ({
                        organizationId: orgId
                    }))
                }
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
            id: teacher.id,
            name: teacher.name,
            account: teacher.account,
            status: teacher.status,
            createTime: teacher.createTime,
            organizations: teacher.organizations.map(to => ({
                id: to.organization.id,
                name: to.organization.name
            }))
        }, '老师信息更新成功')
    } catch (error) {
        return handleError(error)
    }
})
