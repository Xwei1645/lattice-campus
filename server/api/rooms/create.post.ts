import { db } from '../../utils/prisma'
import { requireAuth } from '../../utils/auth'
import { logAudit } from '../../utils/audit'

export default defineEventHandler(async (event) => {
    try {
        const user = await requireAuth(event)

        if (!['super_admin', 'admin'].includes(user.role)) {
            throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
        }

        const body = await readBody(event)
        const { name, capacity, location, description } = body

        if (!name) {
            throw createError({ statusCode: 400, statusMessage: 'Name is required' })
        }

        const room = await db.room.create({
            data: {
                name,
                capacity: capacity ? Number(capacity) : null,
                location,
                description,
                status: true
            }
        })

        await logAudit(event, {
            action: 'room.create',
            resourceType: 'room',
            resourceId: room.id,
            result: 'success',
            after: {
                name: room.name,
                capacity: room.capacity,
                location: room.location,
                status: room.status
            }
        })

        return room
    } catch (error: any) {
        await logAudit(event, {
            action: 'room.create',
            resourceType: 'room',
            result: 'failed',
            reason: error?.statusMessage || error?.message || 'Unknown error'
        })

        if (error.code === 'P2002') {
            throw createError({ statusCode: 400, statusMessage: 'Room name already exists' })
        }
        throw createError({
            statusCode: 500,
            statusMessage: error.message
        })
    }
})
