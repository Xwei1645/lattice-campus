import { db } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'
import { sendSuccess, handleError } from '../../utils/api'
import { z } from 'zod'

const bindSchema = z.object({
    userId: z.number().int().positive(),
    dingTalkOpenId: z.string().min(1)
})

export default defineEventHandler(async (event) => {
    try {
        // 只有管理员可以绑定钉钉
        await requireAdmin(event)

        const body = await readBody(event)
        const { userId, dingTalkOpenId } = bindSchema.parse(body)

        // 检查用户是否存在
        const user = await db.user.findUnique({
            where: { id: userId }
        })

        if (!user) {
            throw createError({
                statusCode: 404,
                statusMessage: '用户不存在'
            })
        }

        // 检查该 OpenID 是否已被其他用户绑定
        const existingUser = await db.user.findUnique({
            where: { dingTalkOpenId }
        })

        if (existingUser && existingUser.id !== userId) {
            throw createError({
                statusCode: 400,
                statusMessage: `该钉钉账号已被用户 ${existingUser.account} 绑定`
            })
        }

        // 绑定钉钉
        await db.user.update({
            where: { id: userId },
            data: { dingTalkOpenId }
        })

        return sendSuccess(event, null, '绑定钉钉成功')
    } catch (error) {
        return handleError(error)
    }
})
