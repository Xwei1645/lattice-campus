import { z } from 'zod'
import { db } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'
import { sendSuccess, handleError } from '../../utils/api'
import { logAudit } from '../../utils/audit'

const orgCreateSchema = z.object({
    name: z.string().min(2, '组织名称至少2个字符').max(50, '组织名称最多50个字符'),
    description: z.string().max(200, '描述不能超过200个字符').optional(),
    userIds: z.array(z.number()).optional()
})

export default defineEventHandler(async (event) => {
    try {
        const currentUser = await requireAdmin(event)
        const body = await readBody(event)

        const { name, description, userIds } = orgCreateSchema.parse(body)

        const existingOrg = await db.organization.findUnique({ where: { name } })
        if (existingOrg) {
            throw createError({ statusCode: 400, statusMessage: 'Organization name already exists' })
        }

        const organization = await db.organization.create({
            data: {
                name,
                description,
                users: {
                    connect: userIds?.map((uid: number) => ({ id: uid })) || []
                }
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

        await logAudit(event, {
            action: 'organization.create',
            resourceType: 'organization',
            resourceId: organization.id,
            result: 'success',
            after: {
                name: organization.name,
                description: organization.description,
                userIds: organization.users.map(item => item.id)
            }
        })

        return sendSuccess(event, organization, '组织创建成功')
    } catch (error) {
        await logAudit(event, {
            action: 'organization.create',
            resourceType: 'organization',
            result: 'failed',
            reason: (error as any)?.statusMessage || (error as any)?.message || 'Unknown error'
        })

        return handleError(error)
    }
})

