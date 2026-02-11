import { db } from '../../utils/prisma'
import { requireAuth } from '../../utils/auth'
import { sendSuccess, handleError } from '../../utils/api'

export default defineEventHandler(async (event) => {
    try {
        const user = await requireAuth(event)
        const isAdmin = ['super_admin', 'admin'].includes(user.role)

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

        return sendSuccess(event, feedbacks, '获取反馈列表成功')
    } catch (error) {
        return handleError(error)
    }
})
