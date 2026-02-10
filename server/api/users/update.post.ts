import { z } from 'zod'
import { db } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'
import { sendSuccess, handleError } from '../../utils/api'

// 定义输入校验 Schema
const userUpdateSchema = z.object({
    id: z.coerce.number().int().positive('无效的用户ID'),
    name: z.string().min(2, '姓名至少2个字符').max(20, '姓名最多20个字符').optional(),
    role: z.enum(['user', 'admin', 'super_admin']).optional(),
    status: z.boolean().optional(),
    organizationIds: z.array(z.number()).optional()
})

export default defineEventHandler(async (event) => {
    try {
        // 只有管理员可以更新用户
        const currentUser = await requireAdmin(event)
        const body = await readBody(event)

        // Zod 校验
        const validatedData = userUpdateSchema.parse(body)
        const { id, name, role, status, organizationIds } = validatedData

        const existingUser = await db.user.findUnique({ where: { id } })
        if (!existingUser) {
            throw createError({ statusCode: 404, statusMessage: 'User not found' })
        }

        // 1. 特殊保护：主超级管理员（ID: 1）
        if (existingUser.id === 1) {
            if (role && role !== 'super_admin') {
                throw createError({ statusCode: 403, statusMessage: 'Cannot change the primary super administrator role' })
            }
            if (status === false) {
                throw createError({ statusCode: 403, statusMessage: 'Cannot disable the primary super administrator' })
            }
        }

        // 2. 权限层级验证
        const roleHierarchy = ['user', 'admin', 'super_admin']
        const currentRoleIndex = roleHierarchy.indexOf(currentUser.role)
        const targetUserRoleIndex = roleHierarchy.indexOf(existingUser.role)

        // 不能修改比自己角色高或同级的人（除非是 super_admin）
        if (targetUserRoleIndex >= currentRoleIndex && currentUser.role !== 'super_admin') {
            throw createError({ statusCode: 403, statusMessage: 'Forbidden: Cannot modify user with higher or equal role' })
        }

        // 3. 角色提升验证：不能将用户提升到比自己高的等级
        if (role) {
            const newRoleIndex = roleHierarchy.indexOf(role)
            if (newRoleIndex >= currentRoleIndex && currentUser.role !== 'super_admin') {
                throw createError({ statusCode: 403, statusMessage: 'Forbidden: Cannot assign role higher than or equal to your own' })
            }
        }

        const user = await db.user.update({
            where: { id },
            data: {
                name,
                role,
                status,
                organizations: organizationIds ? {
                    set: organizationIds.map((id: number) => ({ id }))
                } : undefined
            },
            include: {
                organizations: { select: { id: true, name: true } }
            }
        })

        return sendSuccess(event, {
            id: user.id,
            account: user.account,
            name: user.name,
            role: user.role,
            status: user.status,
            createTime: user.createTime,
            organizations: user.organizations
        }, '用户信息更新成功')

    } catch (error) {
        return handleError(error)
    }
})

