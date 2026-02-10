import { db } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'
import { sendSuccess, handleError } from '../../utils/api'

export default defineEventHandler(async (event) => {
    try {
        // 只有管理员可以查看用户列表
        await requireAdmin(event)

        const users = await db.user.findMany({
            orderBy: {
                createTime: 'desc'
            },
            select: {
                id: true,
                account: true,
                name: true,
                role: true,
                status: true,
                createTime: true,
                organizations: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        })

        return sendSuccess(event, users, '获取用户列表成功')
    } catch (error) {
        return handleError(error)
    }
})

