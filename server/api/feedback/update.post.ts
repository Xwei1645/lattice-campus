import { db } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    await requireAdmin(event)
    const body = await readBody(event)
    const { id, reply, status } = body

    if (!id) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Missing feedback ID'
        })
    }

    const feedback = await db.feedback.update({
        where: { id: Number(id) },
        data: {
            reply,
            status: status || 'resolved'
        }
    })

    return feedback
})
