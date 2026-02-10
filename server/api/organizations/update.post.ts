import { z } from 'zod'
import { db } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'
import { sendSuccess, handleError } from '../../utils/api'

// 定义输入校验 Schema
const orgUpdateSchema = z.object({
    id: z.coerce.number().int().positive('无效的组织ID'),
    name: z.string().min(2, '组织名称至少2个字符').max(50, '组织名称最多50个字符').optional(),
    description: z.string().max(200, '描述不能超过200个字符').optional(),
    userIds: z.array(z.number()).optional()
})

export default defineEventHandler(async (event) => {
    try {
        // 只有管理员可以更新组织
        await requireAdmin(event)
        const body = await readBody(event)

        // Zod 校验
        const { id, name, description, userIds } = orgUpdateSchema.parse(body)

        // 检查组织是否存在
        const existingOrg = await db.organization.findUnique({ where: { id } })
        if (!existingOrg) {
            throw createError({ statusCode: 404, statusMessage: 'Organization not found' })
        }

        // 检查重名冲突
        if (name && name !== existingOrg.name) {
            const duplicateOrg = await db.organization.findFirst({
                where: { name, NOT: { id } }
            })
            if (duplicateOrg) {
                throw createError({ statusCode: 400, statusMessage: 'Organization name already exists' })
            }
        }

        const organization = await db.organization.update({
            where: { id },
            data: {
                name,
                description,
                users: userIds ? {
                    set: userIds.map((uid: number) => ({ id: uid }))
                } : undefined
            },
            include: {
                users: {
                    select: { id: true, name: true, account: true }
                },
                _count: {
                    select: { users: true, bookings: true }
                }
            }
        })

        return sendSuccess(event, organization, '组织信息更新成功')
    } catch (error) {
        return handleError(error)
    }
})

