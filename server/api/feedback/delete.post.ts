import { db } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    await requireAdmin(event)
    const body = await readBody(event)
    const { id } = body

    if (!id) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Missing feedback ID'
        })
    }

    await db.feedback.delete({
        where: { id: Number(id) }
    })

    return { success: true }
})
