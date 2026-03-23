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
        const { id } = body

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

        await (db as any).autoApprovalRule.delete({
            where: { id: ruleId }
        })

        await logAudit(event, {
            action: 'auto-approval.delete',
            resourceType: 'auto-approval-rule',
            resourceId: ruleId,
            result: 'success',
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
            after: null
        })

        return { success: true }
    } catch (error: any) {
        await logAudit(event, {
            action: 'auto-approval.delete',
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
