import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import bcrypt from 'bcryptjs'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set. Please configure it in your .env file.')
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const db = new PrismaClient({ adapter })

async function seed() {
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

    console.log('Seed data created successfully')
  } catch (error) {
    console.error('Error seeding data:', error)
  } finally {
    await db.$disconnect()
  }
}

seed()