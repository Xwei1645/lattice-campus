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
        const { name, organizationId, roomId, userId, maxDuration, startHour, endHour, action } = body

        if (!name) {
            throw createError({ statusCode: 400, statusMessage: 'Rule name is required' })
        }

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

        await logAudit(event, {
            action: 'auto-approval.create',
            resourceType: 'auto-approval-rule',
            resourceId: rule.id,
            result: 'success',
            after: {
                name: rule.name,
                organizationId: rule.organizationId,
                roomId: rule.roomId,
                userId: rule.userId,
                maxDuration: rule.maxDuration,
                startHour: rule.startHour,
                endHour: rule.endHour,
                action: rule.action,
                status: rule.status
            }
        })

        return rule
    } catch (error: any) {
        await logAudit(event, {
            action: 'auto-approval.create',
            resourceType: 'auto-approval-rule',
            result: 'failed',
            reason: error?.statusMessage || error?.message || 'Unknown error'
        })

        throw createError({
            statusCode: error?.statusCode || 500,
            statusMessage: error?.statusMessage || error?.message || 'Internal Server Error'
        })
    }
})
