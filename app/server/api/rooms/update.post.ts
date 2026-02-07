import { db } from '../../utils/prisma'
import { requireAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)

    if (!['root', 'super_admin', 'admin'].includes(user.role)) {
        throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }

    const body = await readBody(event)
    const { id, name, capacity, location, description, status } = body

    if (!id) {
        throw createError({ statusCode: 400, statusMessage: 'ID is required' })
    }

    try {
        const room = await db.room.update({
            where: { id: Number(id) },
            data: {
                name,
                capacity: capacity !== undefined ? Number(capacity) : undefined,
                location,
                description,
                status: status !== undefined ? Boolean(status) : undefined
            }
        })
        return room
    } catch (error: any) {
        throw createError({
            statusCode: 500,
            statusMessage: error.message
        })
    }
})
