import { z } from 'zod'
import { db } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'
import { sendSuccess, handleError } from '../../utils/api'

const deleteSchema = z.object({
    id: z.coerce.number().int().positive('无效的用户ID')
})

export default defineEventHandler(async (event) => {
    try {
        // 只有管理员可以删除用户
        const currentUser = await requireAdmin(event)
        const body = await readBody(event)

        const { id } = deleteSchema.parse(body)

        const user = await db.user.findUnique({ where: { id } })
        if (!user) {
            throw createError({ statusCode: 404, statusMessage: 'User not found' })
        }

        // 1. 特殊保护：不能删除主超级管理员（ID: 1）
        if (user.id === 1) {
            throw createError({ statusCode: 403, statusMessage: 'Forbidden: Cannot delete the primary super administrator' })
        }

        // 2. 自我保护：不能删除自己
        if (user.id === currentUser.id) {
            throw createError({ statusCode: 403, statusMessage: 'Forbidden: Cannot delete yourself' })
        }

        // 3. 权限逻辑：不能删除比自己权限更高或同级的人（除 super_admin 外）
        const roleHierarchy = ['user', 'admin', 'super_admin']
        const currentRoleIndex = roleHierarchy.indexOf(currentUser.role)
        const targetUserRoleIndex = roleHierarchy.indexOf(user.role)

        if (targetUserRoleIndex >= currentRoleIndex && currentUser.role !== 'super_admin') {
            throw createError({ statusCode: 403, statusMessage: 'Forbidden: Cannot delete user with higher or equal role' })
        }

        await db.user.delete({ where: { id } })

        return sendSuccess(event, null, '用户已成功删除')
    } catch (error) {
        return handleError(error)
    }
})

