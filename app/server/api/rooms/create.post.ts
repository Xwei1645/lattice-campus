import { db } from '../../utils/prisma'
import { requireAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)

    // 权限检查
    if (!['root', 'super_admin', 'admin'].includes(user.role)) {
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
