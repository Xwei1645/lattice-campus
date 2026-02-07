import { db } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    // 只有管理员可以删除组织
    await requireAdmin(event)

    const body = await readBody(event)
    const { id } = body

    if (!id) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Organization ID is required'
        })
    }

    try {
        // 检查组织是否存在
        const organization = await db.organization.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        bookings: true
                    }
                }
            }
        })

        if (!organization) {
            throw createError({
                statusCode: 404,
                statusMessage: 'Organization not found'
            })
        }

        // 如果有预订记录，阻止删除
        if (organization._count.bookings > 0) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Cannot delete organization with existing bookings'
            })
        }

        await db.organization.delete({
            where: { id }
        })

        return { success: true, message: 'Organization deleted successfully' }
    } catch (error: any) {
        if (error.statusCode) throw error
        throw createError({
            statusCode: 500,
            statusMessage: error.message
        })
    }
})
