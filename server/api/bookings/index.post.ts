import { z } from 'zod'
import { db } from '../../utils/prisma'
import { requireAuth, isUserInOrganization } from '../../utils/auth'
import { sendSuccess, handleError } from '../../utils/api'

const bookingSchema = z.object({
    roomId: z.coerce.number().int().positive('无效的场地ID'),
    organizationId: z.coerce.number().int().positive('无效的组织ID'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式必须为 YYYY-MM-DD').optional().nullable(),
    timeRange: z.array(z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/)).length(2, '必须提供开始和结束时间'),
    title: z.string().min(2, '活动标题太短').max(200, '活动标题太长'),
    remark: z.string().max(500, '备注太长').optional().nullable(),
    recurringBooking: z.object({
        enabled: z.boolean().default(false),
        weekday: z.coerce.number().int().min(1, '请选择预约日').max(7, '请选择预约日').optional(),
        intervalWeeks: z.coerce.number().int().min(1, '间隔至少为1周').max(8, '间隔不能超过8周').optional(),
        repeatCount: z.coerce.number().int().min(1, '循环次数至少为1').max(52, '循环次数不能超过52').optional()
    }).optional()
}).superRefine((data, ctx) => {
    const isRecurring = Boolean(data.recurringBooking?.enabled)

    if (isRecurring) {
        if (!data.date) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['date'],
                message: '周期预约必须选择首次日期'
            })
        }
        if (!data.recurringBooking?.weekday) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['recurringBooking', 'weekday'],
                message: '周期预约必须选择预约日'
            })
        }
        if (!data.recurringBooking?.intervalWeeks) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['recurringBooking', 'intervalWeeks'],
                message: '周期预约必须填写间隔'
            })
        }
        if (!data.recurringBooking?.repeatCount) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['recurringBooking', 'repeatCount'],
                message: '周期预约必须填写循环次数'
            })
        }
    } else if (!data.date) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['date'],
            message: '单次预约必须选择使用日期'
        })
    }
})

const addDays = (date: Date, days: number) => {
    const next = new Date(date)
    next.setDate(next.getDate() + days)
    return next
}

const formatDate = (date: Date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

const buildSlot = (date: string, startAt: string, endAt: string) => {
    const startTime = new Date(`${date}T${startAt}:00`)
    const endTime = new Date(`${date}T${endAt}:00`)
    return { date, startTime, endTime }
}

export default defineEventHandler(async (event) => {
    try {
        const user = await requireAuth(event)
        const body = await readBody(event)

        const validatedData = bookingSchema.parse(body)
        const { roomId, organizationId, date, timeRange, title, remark, recurringBooking } = validatedData
        const [startAt, endAt] = timeRange

        if (!startAt || !endAt) {
            throw createError({ statusCode: 400, statusMessage: 'Invalid time range' })
        }

        const isAdmin = ['super_admin', 'admin'].includes(user.role)
        if (!isAdmin && !isUserInOrganization(user, organizationId)) {
            throw createError({
                statusCode: 403,
                statusMessage: 'Forbidden: You are not a member of this organization'
            })
        }

        const isRecurringEnabled = Boolean(recurringBooking?.enabled)
        const sampleDate = formatDate(new Date())
        const sampleSlot = buildSlot(sampleDate, startAt, endAt)

        if (sampleSlot.startTime >= sampleSlot.endTime) {
            throw createError({ statusCode: 400, statusMessage: 'End time must be after start time' })
        }

        const slots: Array<{ date: string; startTime: Date; endTime: Date }> = []

        if (!isRecurringEnabled) {
            const baseSlot = buildSlot(date as string, startAt, endAt)
            if (baseSlot.startTime < new Date()) {
                throw createError({ statusCode: 400, statusMessage: 'Booking time must be in the future' })
            }
            slots.push(baseSlot)
        } else {
            const weekday = recurringBooking?.weekday as number
            const intervalWeeks = recurringBooking?.intervalWeeks as number
            const repeatCount = recurringBooking?.repeatCount as number
            const now = new Date()
            const firstDateObj = new Date(`${date}T00:00:00`)

            if (Number.isNaN(firstDateObj.getTime())) {
                throw createError({ statusCode: 400, statusMessage: 'Invalid first booking date' })
            }

            const firstDateStr = formatDate(firstDateObj)
            const firstDateSlot = buildSlot(firstDateStr, startAt, endAt)

            const jsWeekday = weekday % 7
            if (firstDateObj.getDay() !== jsWeekday) {
                throw createError({ statusCode: 400, statusMessage: '首次日期与预约日（星期）不一致' })
            }

            if (firstDateSlot.startTime < now) {
                throw createError({ statusCode: 400, statusMessage: '首次预约时间必须在当前时间之后' })
            }

            for (let index = 0; index < repeatCount; index++) {
                if (index === 0) {
                    slots.push(firstDateSlot)
                    continue
                }

                const currentDate = addDays(firstDateObj, index * intervalWeeks * 7)
                slots.push(buildSlot(formatDate(currentDate), startAt, endAt))
            }
        }

        const result = await db.$transaction(async (tx) => {
            const room = await tx.room.findUnique({ where: { id: roomId } })
            if (!room || !room.status) {
                throw createError({ statusCode: 400, statusMessage: 'Room not found or unavailable' })
            }

            const conflictOrConditions = slots.map(slot => ({
                startTime: { lt: slot.endTime },
                endTime: { gt: slot.startTime }
            }))

            const conflicts = await tx.booking.findMany({
                where: {
                    roomId,
                    status: { notIn: ['cancelled', 'rejected'] },
                    OR: conflictOrConditions
                },
                select: {
                    id: true,
                    startTime: true,
                    endTime: true
                },
                orderBy: { startTime: 'asc' }
            })

            if (conflicts.length > 0) {
                const firstConflict = conflicts[0]
                if (!firstConflict) {
                    throw createError({ statusCode: 500, statusMessage: 'Unexpected conflict state' })
                }
                const firstDate = formatDate(firstConflict.startTime)
                throw createError({
                    statusCode: 400,
                    statusMessage: `Time slot conflicts with existing bookings. First conflict on ${firstDate}, total ${conflicts.length}`
                })
            }

            const autoApprovalRules = await (tx as any).autoApprovalRule.findMany({ where: { status: true } })

            const evaluateAutoApproval = (startTime: Date, endTime: Date) => {
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

                return { finalStatus, autoRemark }
            }

            const createdBookings = []
            for (const slot of slots) {
                const { finalStatus, autoRemark } = evaluateAutoApproval(slot.startTime, slot.endTime)
                const created = await tx.booking.create({
                    data: {
                        roomId,
                        organizationId,
                        userId: user.id,
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                        title,
                        remark: autoRemark,
                        status: finalStatus
                    },
                    include: {
                        organization: { select: { id: true, name: true } },
                        room: { select: { name: true } }
                    }
                })
                createdBookings.push(created)
            }

            return createdBookings
        })

        if (result.length === 1) {
            const single = result[0]
            if (!single) {
                throw createError({ statusCode: 500, statusMessage: 'Unexpected booking creation result' })
            }
            return sendSuccess(event, {
                id: single.id,
                roomName: single.room.name,
                organizationId: single.organization.id,
                organizationName: single.organization.name,
                startTime: single.startTime,
                endTime: single.endTime,
                title: single.title,
                status: single.status,
                remark: single.remark,
                createTime: single.createTime,
                isRecurringBooking: false
            }, '预约提交成功')
        }

        const statusSummary = result.reduce((acc: Record<string, number>, booking) => {
            acc[booking.status] = (acc[booking.status] || 0) + 1
            return acc
        }, {})

        const firstBooking = result[0]
        const lastBooking = result[result.length - 1]
        if (!firstBooking || !lastBooking) {
            throw createError({ statusCode: 500, statusMessage: 'Unexpected recurring booking result' })
        }

        return sendSuccess(event, {
            isRecurringBooking: true,
            totalCreated: result.length,
            bookingIds: result.map(item => item.id),
            startDate: formatDate(firstBooking.startTime),
            endDate: formatDate(lastBooking.startTime),
            statusSummary
        }, `周期预约提交成功，共 ${result.length} 条`)

    } catch (error) {
        return handleError(error)
    }
})

