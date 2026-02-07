import { db } from '../../utils/prisma'
import { requireAuth } from '../../utils/auth'
import { randomBytes } from 'crypto'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)

    if (!['root', 'super_admin', 'admin'].includes(user.role)) {
        throw createError({
            statusCode: 403,
            statusMessage: '没有权限'
        })
    }

    const { count, role, organizationId, expiresAt, maxUses } = await readBody(event)

    if (!count || count < 1) {
        throw createError({
            statusCode: 400,
            statusMessage: '生成的数量必须大于 0'
        })
    }

    try {
        const generatedCodes = []
        for (let i = 0; i < count; i++) {
            const code = randomBytes(4).toString('hex').toUpperCase() // 8 chars code
            generatedCodes.push({
                code,
                role: role || 'user',
                organizationId: organizationId ? parseInt(organizationId) : null,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
                maxUses: maxUses ? parseInt(maxUses) : 1
            })
        }

        const result = await db.invitationCode.createMany({
            data: generatedCodes
        })

        return {
            success: true,
            count: result.count
        }
    } catch (error: any) {
        throw createError({
            statusCode: 500,
            statusMessage: error.message
        })
    }
})
