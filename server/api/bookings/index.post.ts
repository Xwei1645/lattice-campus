import { z } from 'zod'
import { db } from '../../utils/prisma'
import { requireAuth, isUserInOrganization } from '../../utils/auth'
import { sendSuccess, handleError } from '../../utils/api'
import { logSensitiveAction } from '../../utils/audit'

const bookingSchema = z.object({
    roomId: z.coerce.number().int().positive('无效的场地ID'),
    organizationId: z.coerce.number().int().positive('无效的组织ID'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式必须为 YYYY-MM-DD'),
    timeRange: z.array(z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/)).length(2, '必须提供开始和结束时间'),
    purpose: z.string().min(2, '用途描述太短').max(200, '用途描述太长'),
    remark: z.string().max(500, '备注太长').optional().nullable()
})

export default defineEventHandler(async (event) => {
    try {
        const user = await requireAuth(event)
        const body = await readBody(event)

        const validatedData = bookingSchema.parse(body)
        const { roomId, organizationId, date, timeRange, purpose, remark } = validatedData

        const isAdmin = ['super_admin', 'admin'].includes(user.role)
        if (!isAdmin && !isUserInOrganization(user, organizationId)) {
            throw createError({
                statusCode: 403,
                statusMessage: 'Forbidden: You are not a member of this organization'
            })
        }

        const startTime = new Date(`${date}T${timeRange[0]}:00`)
        const endTime = new Date(`${date}T${timeRange[1]}:00`)

        if (startTime < new Date()) {
            throw createError({ statusCode: 400, statusMessage: 'Booking time must be in the future' })
        }
        if (startTime >= endTime) {
            throw createError({ statusCode: 400, statusMessage: 'End time must be after start time' })
        }

        const result = await db.$transaction(async (tx) => {
            const room = await tx.room.findUnique({ where: { id: roomId } })
            if (!room || !room.status) {
                throw createError({ statusCode: 400, statusMessage: 'Room not found or unavailable' })
            }

            const conflict = await tx.booking.findFirst({
                where: {
                    roomId,
                    status: { notIn: ['cancelled', 'rejected'] },
                    OR: [{ startTime: { lt: endTime }, endTime: { gt: startTime } }]
                }
            })

            if (conflict) {
                throw createError({ statusCode: 400, statusMessage: 'Time slot conflicts with an existing booking' })
            }

            const autoApprovalRules = await (tx as any).autoApprovalRule.findMany({ where: { status: true } })
            let finalStatus = 'pending'
            let autoRemark = remark || ''
            const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60)
            const startHourStr = startTime.getHours().toString().padStart(2, '0') + ':' + startTime.getMinutes().toString().padStart(2, '0')

            for (const rule of (autoApprovalRules as any[])) {
                let match = true
                if (rule.organizationId && rule.organizationId !== organizationId) match = false
                if (rule.roomId && rule.roomId !== roomId) match = false
                if (rule.userId && rule.userId !== user.id) match = false
                if (rule.maxDuration && durationMinutes > rule.maxDuration) match = false
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

            return await tx.booking.create({
                data: {
                    roomId,
                    organizationId,
                    userId: user.id,
                    startTime,
                    endTime,
                    purpose,
                    remark: autoRemark,
                    status: finalStatus
                },
                include: {
                    organization: { select: { id: true, name: true } },
                    room: { select: { name: true } }
                }
            })
        })

        await logSensitiveAction(event, 'booking_create', user, result.id, 'booking', {
            roomName: result.room.name,
            organizationId: result.organization.id,
            organizationName: result.organization.name,
            startTime: result.startTime,
            endTime: result.endTime,
            purpose: result.purpose,
            status: result.status
        })

        return sendSuccess(event, {
            id: result.id,
            roomName: result.room.name,
            organizationId: result.organization.id,
            organizationName: result.organization.name,
            startTime: result.startTime,
            endTime: result.endTime,
            purpose: result.purpose,
            status: result.status,
            remark: result.remark,
            createTime: result.createTime
        }, '预约提交成功')

    } catch (error) {
        return handleError(error)
    }
})

