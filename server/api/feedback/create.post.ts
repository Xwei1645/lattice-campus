import { db } from '../../utils/prisma'
import { requireAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)
    const body = await readBody(event)
    const { type, content } = body

    if (!type || !content) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Missing required fields'
        })
    }

    const feedback = await db.feedback.create({
        data: {
            userId: user.id,
            type,
            content,
            status: 'pending'
        }
    })

    return feedback
})
