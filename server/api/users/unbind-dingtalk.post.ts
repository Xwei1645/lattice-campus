import { db } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'
import { sendSuccess, handleError } from '../../utils/api'
import { z } from 'zod'

const unbindSchema = z.object({
    id: z.number().int().positive()
})

export default defineEventHandler(async (event) => {
    try {
        // 只有管理员可以解绑钉钉
        await requireAdmin(event)

        const body = await readBody(event)
        const { id } = unbindSchema.parse(body)

        // 检查用户是否存在
        const user = await db.user.findUnique({
            where: { id }
        })

        if (!user) {
            throw createError({
                statusCode: 404,
                statusMessage: '用户不存在'
            })
        }

        if (!user.dingTalkOpenId) {
            throw createError({
                statusCode: 400,
                statusMessage: '该用户未绑定钉钉'
            })
        }

        // 解绑钉钉
        await db.user.update({
            where: { id },
            data: { dingTalkOpenId: null }
        })

        return sendSuccess(event, null, '解绑钉钉成功')
    } catch (error) {
        return handleError(error)
    }
})
