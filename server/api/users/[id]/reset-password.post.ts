import { db } from '../../../utils/prisma'
import { requireAdmin } from '../../../utils/auth'
import bcrypt from 'bcryptjs'

export default defineEventHandler(async (event) => {
    // 只有管理员可以重置密码
    const currentUser = await requireAdmin(event)
    
    const id = getRouterParam(event, 'id')
    const body = await readBody(event)
    const { password } = body

    if (!id || !password) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Missing user ID or password'
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

        // 权限控制：不能重置比自己权限更高用户的密码
        const roleHierarchy = ['user', 'admin', 'super_admin', 'root']
        const currentRoleIndex = roleHierarchy.indexOf(currentUser.role)
        const targetUserRoleIndex = roleHierarchy.indexOf(user.role)
        
        if (targetUserRoleIndex >= currentRoleIndex && currentUser.role !== 'root') {
            throw createError({
                statusCode: 403,
                statusMessage: 'Cannot reset password for user with higher or equal role'
            })
        }

        const hashedPassword = await bcrypt.hash(password, 10)
        await db.user.update({
            where: { id: parseInt(id) },
            data: {
                password: hashedPassword
            }
        })

        return { success: true, message: 'Password reset successfully' }
    } catch (error: any) {
        if (error.statusCode) throw error
        throw createError({
            statusCode: 500,
            statusMessage: error.message
        })
    }
})
