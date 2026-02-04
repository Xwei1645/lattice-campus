import { db } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    const user = await requireAdmin(event)
    const body = await readBody(event)
    const { title, content, type, status, showPopup } = body

    if (!title || !content) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Title and content are required'
        })
    }

    const notice = await db.notice.create({
        data: {
            title,
            content,
            type: type || 'info',
            status: status || 'published',
            showPopup: !!showPopup,
            creatorId: user.id
        }
    })

    return notice
})
