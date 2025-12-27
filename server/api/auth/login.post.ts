import { db } from '../../utils/prisma'
import { createSession, setSessionCookie } from '../../utils/auth'
import bcrypt from 'bcryptjs'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const { account, password } = body

    if (!account || !password) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Missing account or password'
        })
    }

    try {
        const user = await db.user.findUnique({
            where: { account },
            include: {
                organizations: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        })

        if (!user) {
            throw createError({
                statusCode: 401,
                statusMessage: 'Invalid account or password'
            })
        }

        const isPasswordValid = await bcrypt.compare(password, user.password)

        if (!isPasswordValid) {
            throw createError({
                statusCode: 401,
                statusMessage: 'Invalid account or password'
            })
        }

        if (!user.status) {
            throw createError({
                statusCode: 403,
                statusMessage: 'Account is disabled'
            })
        }

        // 创建session并设置httpOnly cookie
        const sessionToken = createSession(user.id)
        setSessionCookie(event, sessionToken)

        return {
            id: user.id,
            account: user.account,
            name: user.name,
            role: user.role,
            organizations: user.organizations
        }
    } catch (error: any) {
        throw createError({
            statusCode: error.statusCode || 500,
            statusMessage: error.statusMessage || 'Internal Server Error'
        })
    }
})
