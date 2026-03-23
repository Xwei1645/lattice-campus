import { db } from '../../utils/prisma'
import { requireAuth } from '../../utils/auth'
import { logAudit } from '../../utils/audit'

export default defineEventHandler(async (event) => {
    let ruleId: number | null = null

    try {
        const user = await requireAuth(event)
        if (!['super_admin', 'admin'].includes(user.role)) {
            throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
        }

        const body = await readBody(event)
        const { id, name, organizationId, roomId, userId, maxDuration, startHour, endHour, action, status } = body

        if (!id) {
            throw createError({ statusCode: 400, statusMessage: 'ID is required' })
        }

        ruleId = Number(id)
        const oldRule = await (db as any).autoApprovalRule.findUnique({
            where: { id: ruleId }
        })

        if (!oldRule) {
            throw createError({ statusCode: 404, statusMessage: 'Rule not found' })
        }

        const rule = await (db as any).autoApprovalRule.update({
            where: { id: ruleId },
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

        await logAudit(event, {
            action: 'auto-approval.update',
            resourceType: 'auto-approval-rule',
            resourceId: rule.id,
            result: 'success',
            changedFields: ['name', 'organizationId', 'roomId', 'userId', 'maxDuration', 'startHour', 'endHour', 'action', 'status'],
            before: {
                name: oldRule.name,
                organizationId: oldRule.organizationId,
                roomId: oldRule.roomId,
                userId: oldRule.userId,
                maxDuration: oldRule.maxDuration,
                startHour: oldRule.startHour,
                endHour: oldRule.endHour,
                action: oldRule.action,
                status: oldRule.status
            },
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
            action: 'auto-approval.update',
            resourceType: 'auto-approval-rule',
            resourceId: ruleId,
            result: 'failed',
            reason: error?.statusMessage || error?.message || 'Unknown error'
        })

        throw createError({
            statusCode: error?.statusCode || 500,
            statusMessage: error?.statusMessage || error?.message || 'Internal Server Error'
        })
    }
})
