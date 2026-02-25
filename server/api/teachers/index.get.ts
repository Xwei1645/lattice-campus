import { db } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'
import { sendSuccess, handleError } from '../../utils/api'
import { z } from 'zod'

// 查询参数验证schema
const querySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(10),
    keyword: z.string().optional(),
    status: z.enum(['pending', 'active', 'disabled']).optional()
})

/**
 * 获取老师列表API
 * 支持分页、搜索、状态筛选
 */
export default defineEventHandler(async (event) => {
    try {
        // 验证管理员权限
        await requireAdmin(event)

        const query = getQuery(event)
        const { page, pageSize, keyword, status } = querySchema.parse(query)

        // 构建查询条件
        const where: any = {}

        // 状态筛选
        if (status) {
            where.status = status
        }

        // 关键词搜索（姓名或账号）
        if (keyword) {
            where.OR = [
                { name: { contains: keyword } },
                { account: { contains: keyword } }
            ]
        }

        // 查询总数
        const total = await db.teacher.count({ where })

        // 查询老师列表
        const teachers = await db.teacher.findMany({
            where,
            orderBy: {
                createTime: 'desc'
            },
            skip: (page - 1) * pageSize,
            take: pageSize,
            select: {
                id: true,
                name: true,
                account: true,
                status: true,
                dingTalkOpenId: true,
                createTime: true,
                organizations: {
                    select: {
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

        // 格式化返回数据（不暴露敏感的OpenId）
        const formattedTeachers = teachers.map(teacher => ({
            id: teacher.id,
            name: teacher.name,
            account: teacher.account,
            status: teacher.status,
            hasDingTalk: !!teacher.dingTalkOpenId,
            createTime: teacher.createTime,
            organizations: teacher.organizations.map(to => ({
                id: to.organization.id,
                name: to.organization.name
            }))
        }))

        return sendSuccess(event, {
            list: formattedTeachers,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize)
        }, '获取老师列表成功')
    } catch (error) {
        return handleError(error)
    }
})
