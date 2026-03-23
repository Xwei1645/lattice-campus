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
        const { id, name, capacity, location, description, status } = body

        if (!id) {
            throw createError({ statusCode: 400, statusMessage: 'ID is required' })
        }

        roomId = Number(id)

        const oldRoom = await db.room.findUnique({ where: { id: roomId } })
        if (!oldRoom) {
            throw createError({ statusCode: 404, statusMessage: 'Room not found' })
        }

        const room = await db.room.update({
            where: { id: roomId },
            data: {
                name,
                capacity: capacity !== undefined ? Number(capacity) : undefined,
                location,
                description,
                status: status !== undefined ? Boolean(status) : undefined
            }
        })

        await logAudit(event, {
            action: 'room.update',
            resourceType: 'room',
            resourceId: room.id,
            result: 'success',
            changedFields: ['name', 'capacity', 'location', 'description', 'status'],
            before: {
                name: oldRoom.name,
                capacity: oldRoom.capacity,
                location: oldRoom.location,
                description: oldRoom.description,
                status: oldRoom.status
            },
            after: {
                name: room.name,
                capacity: room.capacity,
                location: room.location,
                description: room.description,
                status: room.status
            }
        })

        return room
    } catch (error: any) {
        await logAudit(event, {
            action: 'room.update',
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
