import { db } from '../../utils/prisma'
import { requireAuth } from '../../utils/auth'
import { sendSuccess, handleError } from '../../utils/api'

export default defineEventHandler(async (event) => {
    try {
        await requireAuth(event)
        const query = getQuery(event)
        const page = Number(query.page) || 1
        const pageSize = Number(query.pageSize) || 10

        const where: any = {}

        const [total, notices] = await Promise.all([
            db.notice.count({ where }),
            db.notice.findMany({
                where,
                include: {
                    creator: {
                        select: {
                            name: true
                        }
                    }
                },
                orderBy: {
                    createTime: 'desc'
                },
                skip: (page - 1) * pageSize,
                take: pageSize
            } as any) // 类型断言以避免 include 潜在的提示问题
        ])

        return sendSuccess(event, {
            total,
            notices
        }, '获取通知列表成功')
    } catch (error) {
        return handleError(error)
    }
})
