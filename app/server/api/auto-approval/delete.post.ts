import { db } from '../../utils/prisma'
import { requireAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)
    if (!['root', 'super_admin', 'admin'].includes(user.role)) {
        throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }

    const body = await readBody(event)
    const { id } = body

    if (!id) {
        throw createError({ statusCode: 400, statusMessage: 'ID is required' })
    }

    try {
        await (db as any).autoApprovalRule.delete({
            where: { id: Number(id) }
        })
        return { success: true }
    } catch (error: any) {
        throw createError({ statusCode: 500, statusMessage: error.message })
    }
})
