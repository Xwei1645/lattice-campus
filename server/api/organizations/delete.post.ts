import { z } from 'zod'
import { db } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'
import { sendSuccess, handleError } from '../../utils/api'

const deleteSchema = z.object({
    id: z.coerce.number().int().positive('无效的组织ID')
})

export default defineEventHandler(async (event) => {
    try {
        const currentUser = await requireAdmin(event)
        const body = await readBody(event)

        const { id } = deleteSchema.parse(body)

        const organization = await db.organization.findUnique({
            where: { id },
            include: {
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

        return sendSuccess(event, null, '组织已成功删除')
    } catch (error) {
        return handleError(error)
    }
})

