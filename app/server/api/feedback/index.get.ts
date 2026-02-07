import { db } from '../../utils/prisma'
import { requireAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)
    const isAdmin = ['root', 'super_admin', 'admin'].includes(user.role)

    const feedbacks = await db.feedback.findMany({
        where: isAdmin ? {} : { userId: user.id },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    account: true
                }
            }
        },
        orderBy: {
            createTime: 'desc'
        }
    })

    return feedbacks
})
