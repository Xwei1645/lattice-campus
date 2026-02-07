import { db } from '../../utils/prisma'
import { requireAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)
    if (!['root', 'super_admin', 'admin'].includes(user.role)) {
        throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }

    const body = await readBody(event)
    const { id, name, organizationId, roomId, userId, maxDuration, startHour, endHour, action, status } = body

    if (!id) {
        throw createError({ statusCode: 400, statusMessage: 'ID is required' })
    }

    try {
        const rule = await (db as any).autoApprovalRule.update({
            where: { id: Number(id) },
            data: {
                name,
                organizationId: organizationId ? Number(organizationId) : (organizationId === null ? null : undefined),
                roomId: roomId ? Number(roomId) : (roomId === null ? null : undefined),
                userId: userId ? Number(userId) : (userId === null ? null : undefined),
                maxDuration: maxDuration ? Number(maxDuration) : (maxDuration === null ? null : undefined),
                startHour: startHour !== undefined ? startHour : undefined,
                endHour: endHour !== undefined ? endHour : undefined,
                action,
                status: status !== undefined ? Boolean(status) : undefined
            }
        })
        return rule
    } catch (error: any) {
        throw createError({ statusCode: 500, statusMessage: error.message })
    }
})
