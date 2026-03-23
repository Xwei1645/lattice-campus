import { db } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'
import { logAudit } from '../../utils/audit'

export default defineEventHandler(async (event) => {
    let noticeId: number | null = null

    try {
        await requireAdmin(event)
        const body = await readBody(event)
        const { id } = body

        if (!id) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Notice ID is required'
            })
        }

        noticeId = Number(id)
        const notice = await db.notice.findUnique({ where: { id: noticeId } })

        if (!notice) {
            throw createError({
                statusCode: 404,
                statusMessage: 'Notice not found'
            })
        }

        await db.notice.delete({
            where: { id: noticeId }
        })

        await logAudit(event, {
            action: 'notice.delete',
            resourceType: 'notice',
            resourceId: noticeId,
            result: 'success',
            before: {
                title: notice.title,
                showPopup: notice.showPopup,
                creatorId: notice.creatorId
            },
            after: null
        })

        return { success: true }
    } catch (error: any) {
        await logAudit(event, {
            action: 'notice.delete',
            resourceType: 'notice',
            resourceId: noticeId,
            result: 'failed',
            reason: error?.statusMessage || error?.message || 'Unknown error'
        })
        throw error
    }
})
