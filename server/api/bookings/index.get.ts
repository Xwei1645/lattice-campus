import { db } from '../../utils/prisma'
import { requireAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)

    try {
        const isAdmin = ['root', 'super_admin', 'admin'].includes(user.role)

        const bookings = await db.booking.findMany({
            where: isAdmin ? undefined : {
                userId: user.id
            },
            include: {
                organization: {
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
            roomName: b.roomName,
            organizationId: b.organization.id,
            orgName: b.organization.name,
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
