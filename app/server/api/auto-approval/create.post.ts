import { db } from '../../utils/prisma'
import { requireAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)
    if (!['root', 'super_admin', 'admin'].includes(user.role)) {
        throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }

    const body = await readBody(event)
    const { name, organizationId, roomId, userId, maxDuration, startHour, endHour, action } = body

    if (!name) {
        throw createError({ statusCode: 400, statusMessage: 'Rule name is required' })
    }

    try {
        const rule = await (db as any).autoApprovalRule.create({
            data: {
                name,
                organizationId: organizationId ? Number(organizationId) : null,
                roomId: roomId ? Number(roomId) : null,
                userId: userId ? Number(userId) : null,
                maxDuration: maxDuration ? Number(maxDuration) : null,
                startHour: startHour || null,
                endHour: endHour || null,
                action: action || 'approve',
                status: true
            }
        })
        return rule
    } catch (error: any) {
        throw createError({ statusCode: 500, statusMessage: error.message })
    }
})
