import { db } from '../../utils/prisma'
import { requireAuth } from '../../utils/auth'
import { logAudit } from '../../utils/audit'

function maskCode(code: string): string {
    if (!code || code.length < 8) {
        return '***'
    }
    return `${code.slice(0, 4)}***${code.slice(-4)}`
}

export default defineEventHandler(async (event) => {
    let invitationId: number | null = null

    try {
        const user = await requireAuth(event)

        if (!['super_admin', 'admin'].includes(user.role)) {
            throw createError({
                statusCode: 403,
                statusMessage: '没有权限'
            })
        }

        const { id } = await readBody(event)

        if (!id) {
            throw createError({
                statusCode: 400,
                statusMessage: '缺少 ID'
            })
        }

        invitationId = parseInt(id)
        const oldInvitation = await db.invitationCode.findUnique({
            where: { id: invitationId }
        })

        if (!oldInvitation) {
            throw createError({
                statusCode: 404,
                statusMessage: '邀请码不存在'
            })
        }

        await db.invitationCode.delete({
            where: { id: invitationId }
        })

        await logAudit(event, {
            action: 'invitation-code.delete',
            resourceType: 'invitation-code',
            resourceId: invitationId,
            result: 'success',
            before: {
                code: maskCode(oldInvitation.code),
                role: oldInvitation.role,
                organizationId: oldInvitation.organizationId,
                maxUses: oldInvitation.maxUses,
                usedCount: oldInvitation.usedCount,
                expiresAt: oldInvitation.expiresAt
            },
            after: null
        })

        return { success: true }
    } catch (error: any) {
        await logAudit(event, {
            action: 'invitation-code.delete',
            resourceType: 'invitation-code',
            resourceId: invitationId,
            result: 'failed',
            reason: error?.statusMessage || error?.message || 'Unknown error'
        })

        throw createError({
            statusCode: error.statusCode || 500,
            statusMessage: error.statusMessage || error.message
        })
    }
})
