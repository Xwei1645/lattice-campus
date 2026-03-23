import { z } from 'zod'
import { db } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'
import { sendSuccess, handleError } from '../../utils/api'
import { logAudit } from '../../utils/audit'

const deleteSchema = z.object({
    id: z.coerce.number().int().positive('无效的组织ID')
})

export default defineEventHandler(async (event) => {
    let organizationId: number | null = null

    try {
        await requireAdmin(event)
        const body = await readBody(event)

        const { id } = deleteSchema.parse(body)
        organizationId = id

        const organization = await db.organization.findUnique({
            where: { id },
            include: {
                users: {
                    select: { id: true }
                },
                _count: { select: { bookings: true } }
            }
        })

        if (!organization) {
            throw createError({ statusCode: 404, statusMessage: 'Organization not found' })
        }

        if (organization._count.bookings > 0) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Forbidden: Cannot delete organization with existing bookings'
            })
        }

        await db.organization.delete({ where: { id } })

        await logAudit(event, {
            action: 'organization.delete',
            resourceType: 'organization',
            resourceId: id,
            result: 'success',
            before: {
                name: organization.name,
                description: organization.description,
                userIds: organization.users.map(item => item.id),
                bookingsCount: organization._count.bookings
            },
            after: null
        })

        return sendSuccess(event, null, '组织已成功删除')
    } catch (error) {
        await logAudit(event, {
            action: 'organization.delete',
            resourceType: 'organization',
            resourceId: organizationId,
            result: 'failed',
            reason: (error as any)?.statusMessage || (error as any)?.message || 'Unknown error'
        })

        return handleError(error)
    }
})

