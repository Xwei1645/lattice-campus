import { db } from '../../utils/prisma'
import { requireAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)
    const isAdmin = ['root', 'super_admin', 'admin'].includes(user.role)
    const query = getQuery(event)
    
    // 如果不是管理员，只看已发布的通知
    const where: any = {}
    if (!isAdmin) {
        where.status = 'published'
    } else if (query.status) {
        where.status = query.status as string
    }

    const notices = await db.notice.findMany({
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
        }
    })

    return notices
})
