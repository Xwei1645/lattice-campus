import { db } from '../../utils/prisma'
import { sendSuccess, handleError } from '../../utils/api'
import dayjs from 'dayjs'

export default defineEventHandler(async (event) => {
    try {
        const query = getQuery(event)
        const roomParam = query.room as string

        if (!roomParam) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Missing room parameter'
            })
        }

        // 尝试通过名称或 ID 查找房间
        const roomId = parseInt(roomParam)
        const room = await db.room.findFirst({
            where: {
                OR: [
                    { name: roomParam },
                    { id: isNaN(roomId) ? -1 : roomId }
                ]
            }
        })

        if (!room) {
            throw createError({
                statusCode: 404,
                statusMessage: 'Room not found'
            })
        }

        // 获取该房间的所有预约（为了简单，我们获取最近一段时间的，并在前端过滤）
        // 实际上可以只获取本周的
        const startOfWeek = dayjs().startOf('week').toDate()
        const endOfWeek = dayjs().endOf('week').add(1, 'week').toDate() // 获取两周以确保覆盖

        const bookings = await db.booking.findMany({
            where: {
                roomId: room.id,
                startTime: {
                    gte: startOfWeek,
                    lte: endOfWeek
                },
                status: 'approved' // 仅展示已通过的预约
            },
            include: {
                organization: {
                    select: { name: true }
                },
                user: {
                    select: { name: true }
                }
            },
            orderBy: {
                startTime: 'asc'
            }
        })

        const data = {
            room: {
                id: room.id,
                name: room.name,
                location: room.location,
                capacity: room.capacity,
                status: room.status
            },
            bookings: bookings.map(b => ({
                id: b.id,
                startTime: b.startTime,
                endTime: b.endTime,
                purpose: b.purpose,
                organizationName: b.organization.name,
                userName: b.user.name
            }))
        }

        return sendSuccess(event, data, '获取班牌数据成功')
    } catch (error) {
        return handleError(error)
    }
})
