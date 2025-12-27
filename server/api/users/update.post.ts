import { db } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    // 只有管理员可以更新用户
    const currentUser = await requireAdmin(event)
    
    const body = await readBody(event)
    const { id, name, role, status, organizationIds } = body

    if (!id) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Missing user ID'
        })
    }

    try {
        const existingUser = await db.user.findUnique({
            where: { id: parseInt(id) }
        })

        if (!existingUser) {
            throw createError({
                statusCode: 404,
                statusMessage: 'User not found'
            })
        }

        // 不能修改root管理员的角色
        if (existingUser.account === 'system' && role !== 'root') {
            throw createError({
                statusCode: 403,
                statusMessage: 'Cannot change root administrator role'
            })
        }

        // 权限控制：不能修改比自己权限更高的用户
        const roleHierarchy = ['user', 'admin', 'super_admin', 'root']
        const currentRoleIndex = roleHierarchy.indexOf(currentUser.role)
        const targetUserRoleIndex = roleHierarchy.indexOf(existingUser.role)
        
        if (targetUserRoleIndex >= currentRoleIndex && currentUser.role !== 'root') {
            throw createError({
                statusCode: 403,
                statusMessage: 'Cannot modify user with higher or equal role'
            })
        }

        // 不能将用户提升到比自己更高的角色
        if (role) {
            const newRoleIndex = roleHierarchy.indexOf(role)
            if (newRoleIndex >= currentRoleIndex && currentUser.role !== 'root') {
                throw createError({
                    statusCode: 403,
                    statusMessage: 'Cannot assign role higher than or equal to your own'
                })
            }
        }

        const user = await db.user.update({
            where: { id: parseInt(id) },
            data: {
                name,
                role,
                status,
                organizations: organizationIds ? {
                    set: organizationIds.map((id: number) => ({ id }))
                } : undefined
            },
            include: {
                organizations: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        })

        return {
            id: user.id,
            account: user.account,
            name: user.name,
            role: user.role,
            status: user.status,
            createTime: user.createTime,
            organizations: user.organizations
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        throw createError({
            statusCode: 500,
            statusMessage: error.message
        })
    }
})
