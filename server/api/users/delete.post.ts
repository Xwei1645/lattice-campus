import { db } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    // 只有管理员可以删除用户
    const currentUser = await requireAdmin(event)

    const body = await readBody(event)
    const { id } = body

    if (!id) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Missing user ID'
        })
    }

    try {
        const user = await db.user.findUnique({
            where: { id: parseInt(id) }
        })

        if (!user) {
            throw createError({
                statusCode: 404,
                statusMessage: 'User not found'
            })
        }

        // 不能删除root管理员
        if (user.account === 'system') {
            throw createError({
                statusCode: 403,
                statusMessage: 'Cannot delete root administrator'
            })
        }

        // 不能删除自己
        if (user.id === currentUser.id) {
            throw createError({
                statusCode: 403,
                statusMessage: 'Cannot delete yourself'
            })
        }

        // 权限控制：不能删除比自己权限更高的用户
        const roleHierarchy = ['user', 'admin', 'super_admin', 'root']
        const currentRoleIndex = roleHierarchy.indexOf(currentUser.role)
        const targetUserRoleIndex = roleHierarchy.indexOf(user.role)

        if (targetUserRoleIndex >= currentRoleIndex && currentUser.role !== 'root') {
            throw createError({
                statusCode: 403,
                statusMessage: 'Cannot delete user with higher or equal role'
            })
        }

        await db.user.delete({
            where: { id: parseInt(id) }
        })

        return { success: true, message: 'User deleted successfully' }
    } catch (error: any) {
        if (error.statusCode) throw error
        throw createError({
            statusCode: 500,
            statusMessage: error.message
        })
    }
})
