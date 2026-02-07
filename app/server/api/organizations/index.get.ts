import { db } from '../../utils/prisma'
import { requireAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    // 需要登录才能查看组织列表
    const user = await requireAuth(event)

    try {
        // 管理员可以查看所有组织，普通用户只能看自己所属的组织
        const isAdmin = ['root', 'super_admin', 'admin'].includes(user.role)

        const organizations = await db.organization.findMany({
            where: isAdmin ? undefined : {
                users: {
                    some: {
                        id: user.id
                    }
                }
            },
            orderBy: {
                createTime: 'desc'
            },
            include: {
                users: isAdmin ? {
                    select: {
                        id: true,
                        name: true,
                        account: true
                    }
                } : false,
                _count: {
                    select: {
                        users: true,
                        bookings: true
                    }
                }
            }
        })

        return organizations
    } catch (error: any) {
        throw createError({
            statusCode: 500,
            statusMessage: error.message
        })
    }
})
