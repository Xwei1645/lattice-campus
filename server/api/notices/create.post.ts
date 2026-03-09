import { db } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'
import { logSensitiveAction } from '../../utils/audit'

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

    await logSensitiveAction(event, 'notice_create', currentUser, notice.id, 'notice', {
        title: notice.title,
        showPopup: notice.showPopup
    })

    return notice
})
