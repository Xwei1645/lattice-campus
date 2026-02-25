import { db } from '../../utils/prisma'
import { sendSuccess, handleError } from '../../utils/api'

export default defineEventHandler(async (event) => {
    try {
        const rooms = await db.room.findMany({
            orderBy: {
                createTime: 'desc'
            }
        })
        return sendSuccess(event, rooms, '获取场地列表成功')
    } catch (error: any) {
        return handleError(error)
    }
})
