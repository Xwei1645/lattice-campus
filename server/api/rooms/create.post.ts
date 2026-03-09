import { db } from '../../utils/prisma'
import { requireAuth } from '../../utils/auth'
import { logSensitiveAction } from '../../utils/audit'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)

    if (!['super_admin', 'admin'].includes(user.role)) {
        throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }

    const body = await readBody(event)
    const { name, capacity, location, description } = body

    if (!name) {
        throw createError({ statusCode: 400, statusMessage: 'Name is required' })
    }

    try {
        const room = await db.room.create({
            data: {
                name,
                capacity: capacity ? Number(capacity) : null,
                location,
                description,
                status: true
            }
        })

        await logSensitiveAction(event, 'room_create', user, room.id, 'room', {
            name: room.name,
            capacity: room.capacity,
            location: room.location,
            description: room.description
        })

        return room
    } catch (error: any) {
        if (error.code === 'P2002') {
            throw createError({ statusCode: 400, statusMessage: 'Room name already exists' })
        }
        throw createError({
            statusCode: 500,
            statusMessage: error.message
        })
    }
})
