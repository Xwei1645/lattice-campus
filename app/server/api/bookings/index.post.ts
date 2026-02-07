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
    if (startTime < new Date()) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Booking time must be in the future'
        })
    }

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

        // 检查自动审批规则
        const autoApprovalRules = await (db as any).autoApprovalRule.findMany({
            where: { status: true }
        })

        let finalStatus = 'pending'
        let autoRemark = remark
        const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60)
        const startHourStr = startTime.getHours().toString().padStart(2, '0') + ':' + startTime.getMinutes().toString().padStart(2, '0')

        for (const rule of (autoApprovalRules as any[])) {
            let match = true

            // 检查组织
            if (rule.organizationId && rule.organizationId !== Number(organizationId)) match = false
            // 检查场地
            if (rule.roomId && rule.roomId !== Number(roomId)) match = false
            // 检查用户
            if (rule.userId && rule.userId !== user.id) match = false
            // 检查时长
            if (rule.maxDuration && durationMinutes > rule.maxDuration) match = false
            // 检查时间范围 (HH:mm)
            if (rule.startHour && startHourStr < rule.startHour) match = false
            if (rule.endHour && startHourStr > rule.endHour) match = false

            if (match) {
                if (rule.action === 'approve') {
                    finalStatus = 'approved'
                    autoRemark = (autoRemark ? autoRemark + ' | ' : '') + '系统自动通过: ' + rule.name
                    break
                } else if (rule.action === 'reject') {
                    finalStatus = 'rejected'
                    autoRemark = (autoRemark ? autoRemark + ' | ' : '') + '系统自动驳回: ' + rule.name
                    break
                }
            }
        }

        const booking = await db.booking.create({
            data: {
                roomId: Number(roomId),
                organizationId: Number(organizationId),
                userId: user.id,
                startTime,
                endTime,
                purpose,
                remark: autoRemark,
                status: finalStatus
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
            organizationName: booking.organization.name,
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
