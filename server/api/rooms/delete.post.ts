import { db } from '../../utils/prisma'
import { requireAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)

    if (!['super_admin', 'admin'].includes(user.role)) {
        throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }

    const body = await readBody(event)
    const { id } = body

    if (!id) {
        throw createError({ statusCode: 400, statusMessage: 'ID is required' })
    }

    try {
        const room = await db.room.findUnique({ where: { id: Number(id) } })

        if (!room) {
            throw createError({ statusCode: 404, statusMessage: 'Room not found' })
        }

        const bookingsCount = await db.booking.count({
            where: { roomId: Number(id) }
        })

        if (bookingsCount > 0) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Cannot delete room with existing bookings'
            })
        }

        await db.room.delete({
            where: { id: Number(id) }
        })

        return { success: true }
    } catch (error: any) {
        if (error.statusCode) throw error
        throw createError({
            statusCode: 500,
            statusMessage: error.message
        })
    }
})
