import { db } from '../../utils/prisma'
import { requireAuth } from '../../utils/auth'
import { randomBytes } from 'crypto'
import { logAudit } from '../../utils/audit'

export default defineEventHandler(async (event) => {
    try {
        const user = await requireAuth(event)

        if (!['super_admin', 'admin'].includes(user.role)) {
            throw createError({
                statusCode: 403,
                statusMessage: '没有权限'
            })
        }

        const { count, role, organizationId, expiresAt, maxUses } = 
            await readBody(event)

        if (!count || count < 1) {
            throw createError({
                statusCode: 400,
                statusMessage: '生成的数量必须大于 0'
            })
        }

        if (count > 100) {
            throw createError({
                statusCode: 400,
                statusMessage: '单次最多生成 100 个邀请码'
            })
        }

        const generatedCodes = []
        const generatedCodeSet = new Set<string>()
        while (generatedCodes.length < count) {
            const code = randomBytes(3).toString('hex').toUpperCase()
            if (code.length !== 6 || generatedCodeSet.has(code)) {
                continue
            }
            generatedCodeSet.add(code)
            generatedCodes.push({
                code,
                role: role || 'user',
                organizationId: organizationId ? 
                    parseInt(organizationId) : null,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
                maxUses: maxUses ? parseInt(maxUses) : 1
            })
        }

        const result = await db.invitationCode.createMany({
            data: generatedCodes
        })

        await logAudit(event, {
            action: 'invitation-code.create',
            resourceType: 'invitation-code',
            result: 'success',
            after: {
                count: result.count,
                role: role || 'user',
                organizationId: organizationId ? parseInt(organizationId) : null,
                expiresAt: expiresAt || null,
                maxUses: maxUses ? parseInt(maxUses) : 1
            }
        })

        return {
            success: true,
            count: result.count
        }
    } catch (error: any) {
        await logAudit(event, {
            action: 'invitation-code.create',
            resourceType: 'invitation-code',
            result: 'failed',
            reason: error?.statusMessage || error?.message || 'Unknown error'
        })

        throw createError({
            statusCode: error.statusCode || 500,
            statusMessage: error.statusMessage || error.message
        })
    }
})
