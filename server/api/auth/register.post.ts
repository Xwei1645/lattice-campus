import { db } from '../../utils/prisma'
import bcrypt from 'bcryptjs'

const INVITATION_CODE_LENGTH = 6

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const { account, password, name, invitationCode } = body
    const normalizedInvitationCode = String(invitationCode || '').trim().toUpperCase()

    if (!account || !password || !name || !invitationCode) {
        throw createError({
            statusCode: 400,
            statusMessage: '请填写所有必填项'
        })
    }

    if (normalizedInvitationCode.length !== INVITATION_CODE_LENGTH) {
        throw createError({
            statusCode: 400,
            statusMessage: '邀请码必须为 6 位'
        })
    }

    try {
        const codeData = await db.invitationCode.findUnique({
            where: { code: normalizedInvitationCode },
            include: { organization: true }
        })

        if (!codeData) {
            throw createError({
                statusCode: 400,
                statusMessage: '无效的邀请码'
            })
        }

        if (!codeData.status) {
            throw createError({
                statusCode: 400,
                statusMessage: '邀请码已禁用'
            })
        }

        if (codeData.expiresAt && new Date(codeData.expiresAt) < new Date()) {
            throw createError({
                statusCode: 400,
                statusMessage: '邀请码已过期'
            })
        }

        if (codeData.usedCount >= codeData.maxUses) {
            throw createError({
                statusCode: 400,
                statusMessage: '邀请码使用次数已达上限'
            })
        }

        const existingUser = await db.user.findUnique({
            where: { account }
        })

        if (existingUser) {
            throw createError({
                statusCode: 400,
                statusMessage: '账号已存在'
            })
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        const user = await db.$transaction(async (tx) => {
            await tx.invitationCode.update({
                where: { id: codeData.id },
                data: { usedCount: { increment: 1 } }
            })

            return await tx.user.create({
                data: {
                    account,
                    password: hashedPassword,
                    name,
                    role: codeData.role,
                    status: true,
                    organizations: codeData.organizationId ? {
                        connect: { id: codeData.organizationId }
                    } : undefined
                }
            })
        })

        return {
            success: true,
            message: '注册成功'
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        throw createError({
            statusCode: 500,
            statusMessage: error.message
        })
    }
})
