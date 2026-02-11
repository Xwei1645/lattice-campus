import { db } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    const currentUser = await requireAdmin(event)
    const body = await readBody(event)
    const { title, content, showPopup } = body

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
            showPopup: !!showPopup,
            creatorId: currentUser.id
        }
    })

    return notice
})
