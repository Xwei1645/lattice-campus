import { db } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'
import { logSensitiveAction } from '../../utils/audit'

export default defineEventHandler(async (event) => {
    const currentUser = await requireAdmin(event)
    const body = await readBody(event)
    const { id } = body

    if (!id) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Notice ID is required'
        })
    }

    const notice = await db.notice.findUnique({ where: { id: Number(id) } })

    if (!notice) {
        throw createError({
            statusCode: 404,
            statusMessage: 'Notice not found'
        })
    }

    await db.notice.delete({
        where: { id: Number(id) }
    })

    await logSensitiveAction(event, 'notice_delete', currentUser, notice.id, 'notice', {
        title: notice.title
    })

    return { success: true }
})
