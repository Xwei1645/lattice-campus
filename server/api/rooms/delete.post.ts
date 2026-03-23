import { db } from '../../utils/prisma'
import { requireAuth } from '../../utils/auth'
import { logAudit } from '../../utils/audit'

export default defineEventHandler(async (event) => {
    let roomId: number | null = null

    try {
        const user = await requireAuth(event)

        if (!['super_admin', 'admin'].includes(user.role)) {
            throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
        }

        const body = await readBody(event)
        const { id } = body

        if (!id) {
            throw createError({ statusCode: 400, statusMessage: 'ID is required' })
        }

        roomId = Number(id)

        const room = await db.room.findUnique({ where: { id: roomId } })

        if (!room) {
            throw createError({ statusCode: 404, statusMessage: 'Room not found' })
        }

        const bookingsCount = await db.booking.count({
            where: { roomId }
        })

        if (bookingsCount > 0) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Cannot delete room with existing bookings'
            })
        }

        await db.room.delete({
            where: { id: roomId }
        })

        await logAudit(event, {
            action: 'room.delete',
            resourceType: 'room',
            resourceId: roomId,
            result: 'success',
            before: {
                name: room.name,
                capacity: room.capacity,
                location: room.location,
                description: room.description,
                status: room.status
            },
            after: null
        })

        return { success: true }
    } catch (error: any) {
        await logAudit(event, {
            action: 'room.delete',
            resourceType: 'room',
            resourceId: roomId,
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
