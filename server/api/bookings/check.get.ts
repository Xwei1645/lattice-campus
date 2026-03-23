import { db } from '../../utils/prisma'
import { requireAuth } from '../../utils/auth'
import { sendSuccess, handleError } from '../../utils/api'

export default defineEventHandler(async (event) => {
    try {
        await requireAuth(event)

        const query = getQuery(event)
        const roomId = Number(query.roomId)
        const startTime = query.startTime as string
        const endTime = query.endTime as string

        if (!roomId || !startTime || !endTime) {
            return sendSuccess(event, [], '参数不足')
        }

        const conflicts = await db.booking.findMany({
            where: {
                roomId,
                status: { notIn: ['cancelled', 'rejected'] },
                OR: [{ startTime: { lt: new Date(endTime) }, endTime: { gt: new Date(startTime) } }]
            },
            orderBy: { startTime: 'asc' }
        })

        const mapped = conflicts.map(b => ({
            id: b.id,
            startTime: b.startTime,
            endTime: b.endTime,
            status: b.status
        }))

        return sendSuccess(event, mapped, '查询冲突成功')
    } catch (error) {
        return handleError(error)
    }
})
