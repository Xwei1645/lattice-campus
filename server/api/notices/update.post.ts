import { db } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    await requireAdmin(event)
    const body = await readBody(event)
    const { id, title, content, type, status, showPopup } = body

    if (!id) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Notice ID is required'
        })
    }

    const notice = await db.notice.update({
        where: { id: Number(id) },
        data: {
            title,
            content,
            type,
            status,
            showPopup: !!showPopup
        }
    })

    return notice
})
