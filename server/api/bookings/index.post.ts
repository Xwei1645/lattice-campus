import { db } from '../../utils/prisma'
import { requireAuth, isUserInOrganization } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)

    const body = await readBody(event)
    const { roomId, organizationId, date, timeRange, purpose, remark } = body

    if (!roomId || !organizationId || !date || !timeRange || timeRange.length !== 2 || !purpose) {
        throw createError({ statusCode: 400, statusMessage: 'Missing required fields' })
    }

    // 验证用户是否属于该组织（管理员可以跳过此检查）
    const isAdmin = ['root', 'super_admin', 'admin'].includes(user.role)
    if (!isAdmin && !isUserInOrganization(user, Number(organizationId))) {
        throw createError({
            statusCode: 403,
            statusMessage: 'You are not a member of this organization'
        })
    }

    const startTime = new Date(`${date}T${timeRange[0]}:00`)
    const endTime = new Date(`${date}T${timeRange[1]}:00`)

    // 验证时间范围
    if (startTime >= endTime) {
        throw createError({
            statusCode: 400,
            statusMessage: 'End time must be after start time'
        })
    }

    try {
        // 检查场地是否存在且可用
        const room = await db.room.findUnique({
            where: { id: Number(roomId) }
        })

        if (!room || !room.status) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Room not found or unavailable'
            })
        }

        // 检查时间冲突
        const conflict = await db.booking.findFirst({
            where: {
                roomId: Number(roomId),
                status: { notIn: ['cancelled', 'rejected'] },
                OR: [
                    {
                        startTime: { lt: endTime },
                        endTime: { gt: startTime }
                    }
                ]
            }
        })

        if (conflict) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Time slot conflicts with an existing booking'
            })
        }

        const booking = await db.booking.create({
            data: {
                roomId: Number(roomId),
                organizationId: Number(organizationId),
                userId: user.id,
                startTime,
                endTime,
                purpose,
                remark,
                status: 'pending'
            },
            include: {
                organization: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                room: {
                    select: {
                        name: true
                    }
                }
            }
        })

        return {
            id: booking.id,
            roomName: booking.room.name,
            organizationId: booking.organization.id,
            orgName: booking.organization.name,
            startTime: booking.startTime,
            endTime: booking.endTime,
            purpose: booking.purpose,
            status: booking.status,
            remark: booking.remark,
            createTime: booking.createTime
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        throw createError({
            statusCode: 500,
            statusMessage: error.message
        })
    }
})
