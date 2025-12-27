import { db } from '../../utils/prisma'
import { requireAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)
    
    const body = await readBody(event)
    const { id, status } = body

    if (!id) {
        throw createError({ statusCode: 400, statusMessage: 'Missing booking id' })
    }

    if (!status || !['pending', 'confirmed', 'cancelled', 'rejected'].includes(status)) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid status' })
    }

    try {
        const booking = await db.booking.findUnique({
            where: { id: Number(id) }
        })

        if (!booking) {
            throw createError({ statusCode: 404, statusMessage: 'Booking not found' })
        }

        const isAdmin = ['root', 'super_admin', 'admin'].includes(user.role)

        // 权限检查：
        // - 管理员可以更新任何预订状态
        // - 用户只能取消自己的预订
        if (!isAdmin) {
            if (booking.userId !== user.id) {
                throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
            }
            
            // 普通用户只能取消预订
            if (status !== 'cancelled') {
                throw createError({ 
                    statusCode: 403, 
                    statusMessage: 'You can only cancel your own bookings' 
                })
            }
        }

        const updatedBooking = await db.booking.update({
            where: { id: Number(id) },
            data: { status },
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
                        name: true
                    }
                }
            }
        })

        return {
            id: updatedBooking.id,
            roomName: updatedBooking.roomName,
            organizationId: updatedBooking.organization.id,
            orgName: updatedBooking.organization.name,
            userId: updatedBooking.user.id,
            userName: updatedBooking.user.name,
            startTime: updatedBooking.startTime,
            endTime: updatedBooking.endTime,
            purpose: updatedBooking.purpose,
            status: updatedBooking.status,
            remark: updatedBooking.remark
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        throw createError({
            statusCode: 500,
            statusMessage: error.message
        })
    }
})
