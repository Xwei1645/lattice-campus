import { db } from '../../utils/prisma'
import { requireAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)

    if (!['super_admin', 'admin'].includes(user.role)) {
        throw createError({
            statusCode: 403,
            statusMessage: '没有权限'
        })
    }

    const { id } = await readBody(event)

    if (!id) {
        throw createError({
            statusCode: 400,
            statusMessage: '缺少 ID'
        })
    }

    try {
        await db.invitationCode.delete({
            where: { id: parseInt(id) }
        })

        return { success: true }
    } catch (error: any) {
        throw createError({
            statusCode: 500,
            statusMessage: error.message
        })
    }
})
