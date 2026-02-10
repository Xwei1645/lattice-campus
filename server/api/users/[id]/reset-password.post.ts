import { z } from 'zod'
import { db } from '../../../utils/prisma'
import { requireAdmin } from '../../../utils/auth'
import bcrypt from 'bcryptjs'
import { sendSuccess, handleError } from '../../../utils/api'

const resetPasswordSchema = z.object({
    password: z.string().min(6, '密码至少6个字符').max(20, '密码最多20个字符')
})

export default defineEventHandler(async (event) => {
    try {
        // 只有管理员可以重置密码
        const currentUser = await requireAdmin(event)
        const id = getRouterParam(event, 'id')
        const body = await readBody(event)

        const { password } = resetPasswordSchema.parse(body)

        if (!id) {
            throw createError({ statusCode: 400, statusMessage: 'Missing user ID' })
        }

        const user = await db.user.findUnique({ where: { id: parseInt(id) } })
        if (!user) {
            throw createError({ statusCode: 404, statusMessage: 'User not found' })
        }

        // 权限控制：不能重置比自己权限更高或同级的人（除 super_admin 外）
        const roleHierarchy = ['user', 'admin', 'super_admin']
        const currentRoleIndex = roleHierarchy.indexOf(currentUser.role)
        const targetUserRoleIndex = roleHierarchy.indexOf(user.role)

        if (targetUserRoleIndex >= currentRoleIndex && currentUser.role !== 'super_admin') {
            throw createError({
                statusCode: 403,
                statusMessage: 'Forbidden: Cannot reset password for user with higher or equal role'
            })
        }

        const hashedPassword = await bcrypt.hash(password, 10)
        await db.user.update({
            where: { id: parseInt(id) },
            data: { password: hashedPassword }
        })

        return sendSuccess(event, null, '密码重置成功')
    } catch (error) {
        return handleError(error)
    }
})

