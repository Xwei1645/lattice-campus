import { db } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'
import bcrypt from 'bcryptjs'

export default defineEventHandler(async (event) => {
    // 只有管理员可以创建用户
    const currentUser = await requireAdmin(event)

    const body = await readBody(event)
    const { account, password, name, role, organizationIds } = body

    if (!account || !password || !name) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Missing required fields'
        })
    }

    // 权限控制：不能创建比自己权限更高的用户
    const roleHierarchy = ['user', 'admin', 'super_admin']
    const currentRoleIndex = roleHierarchy.indexOf(currentUser.role)
    const targetRoleIndex = roleHierarchy.indexOf(role || 'user')

    if (targetRoleIndex >= currentRoleIndex && currentUser.role !== 'super_admin') {
        throw createError({
            statusCode: 403,
            statusMessage: 'Cannot create user with higher or equal role'
        })
    }

    try {
        // Check if user already exists
        const existingUser = await db.user.findUnique({
            where: { account }
        })

        if (existingUser) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Account already exists'
            })
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10)

        const user = await db.user.create({
            data: {
                account,
                password: hashedPassword,
                name,
                role: role || 'user',
                status: true,
                organizations: {
                    connect: organizationIds?.map((id: number) => ({ id })) || []
                }
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
