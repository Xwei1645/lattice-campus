import { db } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    // 只有管理员可以创建组织
    await requireAdmin(event)

    const body = await readBody(event)
    const { name, description, userIds } = body

    if (!name) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Organization name is required'
        })
    }

    try {
        const existingOrg = await db.organization.findUnique({
            where: { name }
        })

        if (existingOrg) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Organization name already exists'
            })
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
