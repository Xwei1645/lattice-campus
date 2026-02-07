import { db } from '../../utils/prisma'
import { requireAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
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
        })
    ])

    return {
        total,
        notices
    }
})
