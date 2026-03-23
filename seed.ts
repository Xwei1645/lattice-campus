import { config } from 'dotenv'
config()

import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import bcrypt from 'bcryptjs'

let pool: pg.Pool | null = null

function createPrismaClient() {
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL environment variable is not set. Please configure it in your .env file.')
    }
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
    const adapter = new PrismaPg(pool)
    return new PrismaClient({ adapter })
}

const db = createPrismaClient()

async function seed() {
    console.log('🌱 Starting seed...')

    try {
        console.log('📦 Cleaning existing data...')
        await db.booking.deleteMany()
        await db.autoApprovalRule.deleteMany()
        await db.room.deleteMany()
        await db.organization.deleteMany()
        await db.session.deleteMany()
        await db.user.deleteMany({
            where: {
                account: {
                    not: 'system'
                }
            }
        })

        const hashedPassword = await bcrypt.hash('123456', 10)

        console.log('🏢 Creating organizations...')
        const orgs = await Promise.all([
            db.organization.create({ data: { name: '计算机学院', description: '负责计算机科学与技术相关教学科研' } }),
            db.organization.create({ data: { name: '艺术学院', description: '负责艺术设计与表演相关教学科研' } }),
            db.organization.create({ data: { name: '学生会', description: '校级学生自治组织' } }),
            db.organization.create({ data: { name: '后勤处', description: '校园基础设施保障部门' } })
        ])

        console.log('🏠 Creating rooms...')
        const rooms = await Promise.all([
            db.room.create({ data: { name: '教一 101', capacity: 50, location: '教学楼一楼', description: '多媒体教室' } }),
            db.room.create({ data: { name: '实验楼 202', capacity: 30, location: '实验楼二楼', description: '计算机实验室' } }),
            db.room.create({ data: { name: '报告厅', capacity: 200, location: '图书馆三楼', description: '大型学术报告厅' } }),
            db.room.create({ data: { name: '会议室 305', capacity: 15, location: '行政楼三楼', description: '小型会议室' } })
        ])

        console.log('👥 Creating users...')
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

        console.log('📋 Creating auto-approval rules...')
        await db.autoApprovalRule.createMany({
            data: [
                {
                    name: '计算机学院优先规则',
                    organizationId: orgs[0].id,
                    roomId: rooms[1].id,
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

        console.log('📅 Creating bookings...')
        const now = new Date()
        const oneDay = 24 * 60 * 60 * 1000
        const bookings: Array<{
            roomId: number
            organizationId: number
            userId: number
            startTime: Date
            endTime: Date
            title: string
            status: string
            remark: string | null
        }> = []

        const pastStatuses = ['approved', 'approved', 'approved', 'rejected']
        const futureStatuses = ['pending', 'pending', 'approved', 'cancelled']
        const purposes = ['部门例会', '社团活动', '学术讲座', '班级会议', '期末复习', '项目研讨', '面试', '彩排']

        for (let i = -7; i <= 14; i++) {
            const currentDate = new Date(now.getTime() + i * oneDay)
            currentDate.setHours(0, 0, 0, 0)

            const shuffledRooms = [...rooms].sort(() => 0.5 - Math.random())
            const selectedRooms = shuffledRooms.slice(0, Math.random() > 0.5 ? 3 : 2)

            for (const room of selectedRooms) {
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

                    const user = users[Math.floor(Math.random() * users.length)]!

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
                        title: purposes[Math.floor(Math.random() * purposes.length)]!,
                        status,
                        remark: status === 'rejected' ? '场地冲突或不符合规定' : null
                    })
                }
            }
        }

        for (const b of bookings) {
            await db.booking.create({ data: b as any })
        }

        console.log('\n✅ Seed completed successfully!')
        console.log(`   Users: ${users.length}`)
        console.log(`   Organizations: ${orgs.length}`)
        console.log(`   Rooms: ${rooms.length}`)
        console.log(`   Bookings: ${bookings.length}`)
    } catch (error) {
        console.error('❌ Seed failed:', error)
        process.exit(1)
    } finally {
        await db.$disconnect()
        if (pool) await pool.end()
    }
}

seed()
