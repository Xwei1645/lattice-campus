import { db } from '../../utils/prisma'
import bcrypt from 'bcryptjs'

export default defineEventHandler(async (event) => {
    // 仅开发环境可用
    if (!process.dev) {
        throw createError({
            statusCode: 403,
            statusMessage: 'Forbidden: Only available in development environment'
        })
    }

    try {
        // 清理现有数据 (按顺序删除以避免外键约束问题)
        await db.booking.deleteMany()
        await db.autoApprovalRule.deleteMany()
        await db.room.deleteMany()
        await db.organization.deleteMany()
        await db.session.deleteMany()
        await db.user.deleteMany({
            where: {
                account: {
                    not: 'system' // 保留系统管理员
                }
            }
        })

        const hashedPassword = await bcrypt.hash('123456', 10)

        // 1. 创建组织
        const orgs = await Promise.all([
            db.organization.create({ data: { name: '计算机学院', description: '负责计算机科学与技术相关教学科研' } }),
            db.organization.create({ data: { name: '艺术学院', description: '负责艺术设计与表演相关教学科研' } }),
            db.organization.create({ data: { name: '学生会', description: '校级学生自治组织' } }),
            db.organization.create({ data: { name: '后勤处', description: '校园基础设施保障部门' } })
        ])

        // 2. 创建房间
        const rooms = await Promise.all([
            db.room.create({ data: { name: '教一 101', capacity: 50, location: '教学楼一楼', description: '多媒体教室' } }),
            db.room.create({ data: { name: '实验楼 202', capacity: 30, location: '实验楼二楼', description: '计算机实验室' } }),
            db.room.create({ data: { name: '报告厅', capacity: 200, location: '图书馆三楼', description: '大型学术报告厅' } }),
            db.room.create({ data: { name: '会议室 305', capacity: 15, location: '行政楼三楼', description: '小型会议室' } })
        ])

        // 3. 创建用户
        const users = await Promise.all([
            db.user.create({
                data: {
                    account: 'teacher1', password: hashedPassword, name: '张老师', role: 'admin',
                    organizations: { connect: { id: orgs[0].id } }
                }
            }),
            db.user.create({
                data: {
                    account: 'teacher2', password: hashedPassword, name: '王老师', role: 'admin',
                    organizations: { connect: { id: orgs[1].id } }
                }
            }),
            db.user.create({
                data: {
                    account: 'student1', password: hashedPassword, name: '李同学', role: 'user',
                    organizations: { connect: [{ id: orgs[0].id }, { id: orgs[2].id }] }
                }
            }),
            db.user.create({
                data: {
                    account: 'student2', password: hashedPassword, name: '赵同学', role: 'user',
                    organizations: { connect: { id: orgs[1].id } }
                }
            }),
            db.user.create({
                data: {
                    account: 'staff1', password: hashedPassword, name: '陈师傅', role: 'user',
                    organizations: { connect: { id: orgs[3].id } }
                }
            })
        ])

        // 4. 创建自动审批规则
        await db.autoApprovalRule.createMany({
            data: [
                {
                    name: '计算机学院优先规则',
                    organizationId: orgs[0].id,
                    roomId: rooms[1].id, // 实验楼 202
                    action: 'approve',
                    status: true
                },
                {
                    name: '报告厅夜间自动驳回',
                    roomId: rooms[2].id,
                    startHour: '22:00',
                    endHour: '06:00',
                    action: 'reject',
                    status: true
                }
            ]
        })

        // 5. 批量创建预约 (覆盖前一周、当周、后两周)
        const now = new Date()
        const oneDay = 24 * 60 * 60 * 1000
        const bookings = []

        // 状态池
        const pastStatuses = ['approved', 'approved', 'approved', 'rejected']
        const futureStatuses = ['pending', 'pending', 'approved', 'cancelled']

        // 用途池
        const purposes = ['部门例会', '社团活动', '学术讲座', '班级会议', '期末复习', '项目研讨', '面试', '彩排']

        // 遍历前 7 天到后 14 天
        for (let i = -7; i <= 14; i++) {
            const currentDate = new Date(now.getTime() + i * oneDay)
            currentDate.setHours(0, 0, 0, 0)

            // 每天随机选 2-3 个场地
            const selectedRooms = rooms.sort(() => 0.5 - Math.random()).slice(0, Math.random() > 0.5 ? 3 : 2)

            for (const room of selectedRooms) {
                // 每个场地每天 1-4 场预约
                const sessionCount = Math.floor(Math.random() * 4) + 1
                const timeSlots = [
                    { start: 8, end: 10 },
                    { start: 10, end: 12 },
                    { start: 14, end: 16 },
                    { start: 16, end: 18 },
                    { start: 19, end: 21 }
                ].slice(0, sessionCount)

                for (const slot of timeSlots) {
                    const startTime = new Date(currentDate)
                    startTime.setHours(slot.start)
                    const endTime = new Date(currentDate)
                    endTime.setHours(slot.end)

                    const isPast = i < 0
                    const status = isPast
                        ? pastStatuses[Math.floor(Math.random() * pastStatuses.length)]
                        : futureStatuses[Math.floor(Math.random() * futureStatuses.length)]

                    const user = users[Math.floor(Math.random() * users.length)]

                    // 映射用户到其对应的组织 ID
                    let orgId = orgs[0].id
                    if (user.account === 'teacher1') orgId = orgs[0].id
                    else if (user.account === 'teacher2') orgId = orgs[1].id
                    else if (user.account === 'student1') orgId = Math.random() > 0.5 ? orgs[0].id : orgs[2].id
                    else if (user.account === 'student2') orgId = orgs[1].id
                    else if (user.account === 'staff1') orgId = orgs[3].id

                    bookings.push({
                        roomId: room.id,
                        organizationId: orgId,
                        userId: user.id,
                        startTime,
                        endTime,
                        purpose: purposes[Math.floor(Math.random() * purposes.length)],
                        status,
                        remark: status === 'rejected' ? '场地冲突或不符合规定' : null
                    })
                }
            }
        }

        for (const b of bookings) {
            await db.booking.create({ data: b })
        }

        return {
            success: true,
            message: '示例数据加载成功',
            details: {
                users: users.length,
                orgs: orgs.length,
                rooms: rooms.length,
                bookings: bookings.length
            }
        }
    } catch (error: any) {
        console.error('Seed error:', error)
        throw createError({
            statusCode: 500,
            statusMessage: error.message || 'Internal Server Error'
        })
    }
})
