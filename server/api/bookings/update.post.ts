import { db } from '../../utils/prisma'
import { requireAuth } from '../../utils/auth'
import { logAudit } from '../../utils/audit'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)

    const body = await readBody(event)
    const { id, status } = body

    if (!id) {
        throw createError({ statusCode: 400, statusMessage: 'Missing booking id' })
    }

    if (!status || !['pending', 'approved', 'cancelled', 'rejected'].includes(status)) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid status' })
    }

    try {
        const booking = await db.booking.findUnique({
            where: { id: Number(id) }
        })

        if (!booking) {
            throw createError({ statusCode: 404, statusMessage: 'Booking not found' })
        }

        const isAdmin = ['super_admin', 'admin'].includes(user.role)

        if (!isAdmin) {
            if (booking.userId !== user.id) {
                throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
            }

            if (status !== 'cancelled') {
                throw createError({
                    statusCode: 403,
                    statusMessage: 'You can only cancel your own bookings'
                })
            }
        }

        const updatedBooking = await db.booking.update({
            where: { id: Number(id) },
            data: {
                status,
                remark: body.remark
            },
            include: {
                organization: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                room: {
                    select: {
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

        await logAudit(event, {
            action: 'booking.update-status',
            resourceType: 'booking',
            resourceId: updatedBooking.id,
            result: 'success',
            changedFields: ['status', 'remark'],
            before: {
                status: booking.status,
                remark: booking.remark
            },
            after: {
                status: updatedBooking.status,
                remark: updatedBooking.remark
            }
        })

        return {
            id: updatedBooking.id,
            roomName: updatedBooking.room.name,
            organizationId: updatedBooking.organization.id,
            organizationName: updatedBooking.organization.name,
            userId: updatedBooking.user.id,
            userName: updatedBooking.user.name,
            startTime: updatedBooking.startTime,
            endTime: updatedBooking.endTime,
            title: updatedBooking.title,
            status: updatedBooking.status,
            remark: updatedBooking.remark
        }
    } catch (error: any) {
        await logAudit(event, {
            action: 'booking.update-status',
            resourceType: 'booking',
            resourceId: Number(id) || null,
            result: 'failed',
            reason: error?.statusMessage || error?.message || 'Unknown error'
        })

        if (error.statusCode) throw error
        throw createError({
            statusCode: 500,
            statusMessage: error.message
        })
    }
})
