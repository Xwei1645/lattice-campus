import { db } from '../../utils/prisma'
import { requireAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)

    const query = getQuery(event)
    const scope = query.scope as string

    try {
        const isAdmin = ['root', 'super_admin', 'admin'].includes(user.role)

        // 如果是管理员，或者请求 scope 为 all，则查询所有预约
        // 否则只查询自己的预约
        const whereCondition: any = {}

        if (!isAdmin && scope !== 'all') {
            whereCondition.userId = user.id
        }

        const bookings = await db.booking.findMany({
            where: whereCondition,
            include: {
                organization: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                room: {
                    select: {
                        id: true,
                        name: true
                    }
                },
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

        return bookings.map(b => ({
            id: b.id,
            roomId: b.room.id,
            roomName: b.room.name,
            organizationId: b.organization.id,
            organizationName: b.organization.name,
            userId: b.user.id,
            userName: b.user.name,
            startTime: b.startTime,
            endTime: b.endTime,
            purpose: b.purpose,
            status: b.status,
            remark: b.remark,
            createTime: b.createTime
        }))
    } catch (error: any) {
        throw createError({
            statusCode: 500,
            statusMessage: error.message
        })
    }
})
