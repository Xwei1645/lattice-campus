import { db } from '../../utils/prisma'
import { requireAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)
    if (!['root', 'super_admin', 'admin'].includes(user.role)) {
        throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }

    try {
        const rules = await (db as any).autoApprovalRule.findMany({
            orderBy: { createTime: 'desc' }
        })

        // 获取所有相关的名称
        const orgIds = rules.map((r: any) => r.organizationId).filter(Boolean)
        const userIds = rules.map((r: any) => r.userId).filter(Boolean)
        const roomIds = rules.map((r: any) => r.roomId).filter(Boolean)

        const [orgs, users, rooms] = await Promise.all([
            db.organization.findMany({ where: { id: { in: orgIds } }, select: { id: true, name: true } }),
            db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } }),
            db.room.findMany({ where: { id: { in: roomIds } }, select: { id: true, name: true } })
        ])

        const orgMap = Object.fromEntries(orgs.map(o => [o.id, o.name]))
        const userMap = Object.fromEntries(users.map(u => [u.id, u.name]))
        const roomMap = Object.fromEntries(rooms.map(r => [r.id, r.name]))

        return rules.map((rule: any) => ({
            ...rule,
            organizationName: rule.organizationId ? orgMap[rule.organizationId] : null,
            userName: rule.userId ? userMap[rule.userId] : null,
            roomName: rule.roomId ? roomMap[rule.roomId] : null
        }))
    } catch (error: any) {
        throw createError({ statusCode: 500, statusMessage: error.message })
    }
})
