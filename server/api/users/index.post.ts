import { z } from 'zod'
import { db } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'
import bcrypt from 'bcryptjs'
import { sendSuccess, handleError } from '../../utils/api'

const userCreateSchema = z.object({
    account: z.string().min(4, '账号至少4个字符').max(20, '账号最多20个字符').regex(/^[a-zA-Z0-9_]+$/, '账号只能包含字母、数字和下划线'),
    password: z.string().min(6, '密码至少6个字符').max(20, '密码最多20个字符'),
    name: z.string().min(2, '姓名至少2个字符').max(20, '姓名最多20个字符'),
    role: z.enum(['user', 'admin', 'super_admin']).default('user'),
    organizationIds: z.array(z.number()).optional()
})

export default defineEventHandler(async (event) => {
    try {
        const currentUser = await requireAdmin(event)
        const body = await readBody(event)

        const validatedData = userCreateSchema.parse(body)
        const { account, password, name, role, organizationIds } = validatedData

        const roleHierarchy = ['user', 'admin', 'super_admin']
        const currentRoleIndex = roleHierarchy.indexOf(currentUser.role)
        const targetRoleIndex = roleHierarchy.indexOf(role)

        if (targetRoleIndex >= currentRoleIndex && currentUser.role !== 'super_admin') {
            throw createError({
                statusCode: 403,
                statusMessage: 'Forbidden: Cannot create user with higher or equal role'
            })
        }

        const existingUser = await db.user.findUnique({ where: { account } })
        if (existingUser) {
            throw createError({ statusCode: 400, statusMessage: 'Account already exists' })
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        const user = await db.user.create({
            data: {
                account,
                password: hashedPassword,
                name,
                role,
                status: true,
                organizations: {
                    connect: organizationIds?.map((id: number) => ({ id })) || []
                }
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
        }, '用户创建成功')

    } catch (error) {
        return handleError(error)
    }
})

