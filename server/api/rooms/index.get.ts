import { db } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
    try {
        const rooms = await db.room.findMany({
            orderBy: {
                createTime: 'desc'
            }
        })
        return rooms
    } catch (error: any) {
        throw createError({
            statusCode: 500,
            statusMessage: error.message
        })
    }
})
