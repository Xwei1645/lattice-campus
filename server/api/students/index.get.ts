import { db } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'
import { sendSuccess, handleError } from '../../utils/api'
import { z } from 'zod'

// 查询参数验证schema
const querySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(10),
    keyword: z.string().optional(),
    status: z.enum(['active', 'disabled']).optional()
})

/**
 * 获取学生列表API
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

        // 关键词搜索（姓名、学号或账号）
        if (keyword) {
            where.OR = [
                { name: { contains: keyword } },
                { studentId: { contains: keyword } },
                { account: { contains: keyword } }
            ]
        }

        // 查询总数
        const total = await db.student.count({ where })

        // 查询学生列表
        const students = await db.student.findMany({
            where,
            orderBy: {
                createTime: 'desc'
            },
            skip: (page - 1) * pageSize,
            take: pageSize,
            select: {
                id: true,
                name: true,
                studentId: true,
                account: true,
                status: true,
                seewoOpenId: true,
                createTime: true
            }
        })

        // 格式化返回数据（不暴露敏感的OpenId）
        const formattedStudents = students.map(student => ({
            id: student.id,
            name: student.name,
            studentId: student.studentId,
            account: student.account,
            status: student.status,
            hasSeewo: !!student.seewoOpenId,
            createTime: student.createTime
        }))

        return sendSuccess(event, {
            list: formattedStudents,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize)
        }, '获取学生列表成功')
    } catch (error) {
        return handleError(error)
    }
})
