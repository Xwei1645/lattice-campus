import { db } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    // 只有管理员可以更新组织
    await requireAdmin(event)

    const body = await readBody(event)
    const { id, name, description, userIds } = body

    if (!id) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Organization ID is required'
        })
    }

    try {
        // 检查组织是否存在
        const existingOrg = await db.organization.findUnique({
            where: { id }
        })

        if (!existingOrg) {
            throw createError({
                statusCode: 404,
                statusMessage: 'Organization not found'
            })
        }

        // Check if name exists for other organizations
        if (name && name !== existingOrg.name) {
            const duplicateOrg = await db.organization.findFirst({
                where: {
                    name,
                    NOT: { id }
                }
            })

            if (duplicateOrg) {
                throw createError({
                    statusCode: 400,
                    statusMessage: 'Organization name already exists'
                })
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
                    select: {
                        id: true,
                        name: true,
                        account: true
                    }
                },
                _count: {
                    select: {
                        users: true,
                        bookings: true
                    }
                }
            }
        })

        return organization
    } catch (error: any) {
        if (error.statusCode) throw error
        throw createError({
            statusCode: 500,
            statusMessage: error.message
        })
    }
})
