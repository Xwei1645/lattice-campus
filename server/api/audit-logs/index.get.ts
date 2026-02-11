import { db } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'
import { sendSuccess, handleError } from '../../utils/api'

export default defineEventHandler(async (event) => {
    try {
        await requireAdmin(event)
        const query = getQuery(event)

        const page = Number(query.page) || 1
        const pageSize = Number(query.pageSize) || 20
        const actionType = query.actionType as string
        const userId = query.userId ? Number(query.userId) : undefined

        const skip = (page - 1) * pageSize

        const where: any = {}

        if (actionType) {
            where.actionType = actionType
        }

        if (userId) {
            where.userId = userId
        }

        const [logs, total] = await Promise.all([
            db.auditLog.findMany({
                where,
                orderBy: { createTime: 'desc' },
                skip,
                take: pageSize,
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            account: true
                        }
                    }
                }
            }),
            db.auditLog.count({ where })
        ])

        return sendSuccess(event, {
            logs: logs.map(log => ({
                id: log.id,
                actionType: log.actionType,
                userId: log.userId,
                userName: log.userName,
                userRole: log.userRole,
                user: log.user,
                targetId: log.targetId,
                targetType: log.targetType,
                details: log.details ? JSON.parse(log.details) : null,
                ipAddress: log.ipAddress,
                userAgent: log.userAgent,
                status: log.status,
                errorMessage: log.errorMessage,
                createTime: log.createTime
            })),
            pagination: {
                page,
                pageSize,
                total,
                totalPages: Math.ceil(total / pageSize)
            }
        })

    } catch (error) {
        return handleError(error)
    }
})
