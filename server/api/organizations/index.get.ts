import { db } from '../../utils/prisma'
import { requireAuth } from '../../utils/auth'
import { sendSuccess, handleError } from '../../utils/api'

export default defineEventHandler(async (event) => {
    try {
        // 需要登录才能查看组织列表
        const user = await requireAuth(event)
        const isAdmin = ['super_admin', 'admin'].includes(user.role)

        const organizations = await db.organization.findMany({
            where: isAdmin ? undefined : {
                users: { some: { id: user.id } }
            },
            orderBy: {
                createTime: 'desc'
            },
            include: {
                users: isAdmin ? {
                    select: { id: true, name: true, account: true }
                } : false,
                _count: {
                    select: { users: true, bookings: true }
                }
            }
        })

        return sendSuccess(event, organizations, '获取组织列表成功')
    } catch (error) {
        return handleError(error)
    }
})

