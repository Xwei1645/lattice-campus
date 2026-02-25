import { db } from '../../utils/prisma'
import { requireAuth } from '../../utils/auth'
import { sendSuccess, handleError } from '../../utils/api'

export default defineEventHandler(async (event) => {
    try {
        const user = await requireAuth(event)

        // 只有超级管理员和管理员可以管理邀请码
        if (!['super_admin', 'admin'].includes(user.role)) {
            throw createError({
                statusCode: 403,
                statusMessage: '没有权限'
            })
        }

        const codes = await db.invitationCode.findMany({
            include: {
                organization: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            orderBy: {
                createTime: 'desc'
            }
        })

        return sendSuccess(event, codes, '获取邀请码列表成功')
    } catch (error) {
        return handleError(error)
    }
})
