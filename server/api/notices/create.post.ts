import { db } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'
import { logAudit } from '../../utils/audit'

export default defineEventHandler(async (event) => {
    try {
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

        await logAudit(event, {
            action: 'notice.create',
            resourceType: 'notice',
            resourceId: notice.id,
            result: 'success',
            after: {
                title: notice.title,
                showPopup: notice.showPopup,
                creatorId: notice.creatorId
            }
        })

        return notice
    } catch (error: any) {
        await logAudit(event, {
            action: 'notice.create',
            resourceType: 'notice',
            result: 'failed',
            reason: error?.statusMessage || error?.message || 'Unknown error'
        })
        throw error
    }
})
