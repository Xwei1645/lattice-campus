import { z } from 'zod'
import { db } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'
import { sendSuccess, handleError } from '../../utils/api'
import { logAudit } from '../../utils/audit'

const deleteSchema = z.object({
    id: z.coerce.number().int().positive('无效的用户ID')
})

export default defineEventHandler(async (event) => {
    try {
        const currentUser = await requireAdmin(event)
        const body = await readBody(event)

        const { id } = deleteSchema.parse(body)

        const user = await db.user.findUnique({ where: { id } })
        if (!user) {
            throw createError({ statusCode: 404, statusMessage: 'User not found' })
        }

        if (user.id === 1) {
            throw createError({ statusCode: 403, statusMessage: 'Forbidden: Cannot delete the primary super administrator' })
        }

        if (user.id === currentUser.id) {
            throw createError({ statusCode: 403, statusMessage: 'Forbidden: Cannot delete yourself' })
        }

        const roleHierarchy = ['user', 'admin', 'super_admin']
        const currentRoleIndex = roleHierarchy.indexOf(currentUser.role)
        const targetUserRoleIndex = roleHierarchy.indexOf(user.role)

        if (targetUserRoleIndex >= currentRoleIndex && currentUser.role !== 'super_admin') {
            throw createError({ statusCode: 403, statusMessage: 'Forbidden: Cannot delete user with higher or equal role' })
        }

        const userSnapshot = {
            id: user.id,
            account: user.account,
            name: user.name,
            role: user.role,
            status: user.status
        }

        await db.user.delete({ where: { id } })

        await logAudit(event, {
            action: 'user.delete',
            resourceType: 'user',
            resourceId: id,
            result: 'success',
            before: userSnapshot,
            after: null
        })

        return sendSuccess(event, null, '用户已成功删除')
    } catch (error) {
        await logAudit(event, {
            action: 'user.delete',
            resourceType: 'user',
            result: 'failed',
            reason: (error as any)?.statusMessage || (error as any)?.message || 'Unknown error'
        })

        return handleError(error)
    }
})

