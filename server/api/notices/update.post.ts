import { db } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'
import { logAudit } from '../../utils/audit'

export default defineEventHandler(async (event) => {
    let noticeId: number | null = null

    try {
        await requireAdmin(event)
        const body = await readBody(event)
        const { id, title, content, showPopup } = body

        if (!id) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Notice ID is required'
            })
        }

        noticeId = Number(id)

        const oldNotice = await db.notice.findUnique({
            where: { id: noticeId }
        })

        if (!oldNotice) {
            throw createError({
                statusCode: 404,
                statusMessage: 'Notice not found'
            })
        }

        const notice = await db.notice.update({
            where: { id: noticeId },
            data: {
                title,
                content,
                showPopup: !!showPopup
            }
        })

        await logAudit(event, {
            action: 'notice.update',
            resourceType: 'notice',
            resourceId: notice.id,
            result: 'success',
            changedFields: ['title', 'content', 'showPopup'],
            before: {
                title: oldNotice.title,
                content: oldNotice.content,
                showPopup: oldNotice.showPopup
            },
            after: {
                title: notice.title,
                content: notice.content,
                showPopup: notice.showPopup
            }
        })

        return notice
    } catch (error: any) {
        await logAudit(event, {
            action: 'notice.update',
            resourceType: 'notice',
            resourceId: noticeId,
            result: 'failed',
            reason: error?.statusMessage || error?.message || 'Unknown error'
        })
        throw error
    }
})
