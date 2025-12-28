import { H3Event, createError } from 'h3'
import { db } from './prisma'
import crypto from 'crypto'

// Session配置
const SESSION_COOKIE_NAME = 'session_token'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7天（秒）

/**
 * 生成安全的session token
 */
export function generateSessionToken(): string {
    return crypto.randomBytes(32).toString('hex')
}

/**
 * 创建用户会话并存入数据库
 */
export async function createSession(userId: number): Promise<string> {
    const token = generateSessionToken()
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000)

    await db.session.create({
        data: {
            id: token,
            userId,
            expiresAt
        }
    })

    // 异步清理过期session
    cleanupExpiredSessions().catch(console.error)

    return token
}

/**
 * 删除会话
 */
export async function deleteSession(token: string): Promise<void> {
    try {
        await db.session.delete({
            where: { id: token }
        })
    } catch {
        // 忽略不存在的情况
    }
}

/**
 * 清理过期的session
 */
async function cleanupExpiredSessions(): Promise<void> {
    await db.session.deleteMany({
        where: {
            expiresAt: {
                lt: new Date()
            }
        }
    })
}

/**
 * 从请求中获取session token
 */
export function getSessionToken(event: H3Event): string | undefined {
    return getCookie(event, SESSION_COOKIE_NAME)
}

/**
 * 设置session cookie
 */
export function setSessionCookie(event: H3Event, token: string): void {
    setCookie(event, SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_MAX_AGE,
        path: '/'
    })
}

/**
 * 清除session cookie
 */
export function clearSessionCookie(event: H3Event): void {
    deleteCookie(event, SESSION_COOKIE_NAME, {
        path: '/'
    })
}

/**
 * 验证session并返回用户ID
 */
export async function validateSession(token: string): Promise<number | null> {
    const session = await db.session.findUnique({
        where: { id: token },
        include: { user: true }
    })

    if (!session) {
        return null
    }

    if (session.expiresAt < new Date()) {
        await db.session.delete({ where: { id: token } })
        return null
    }

    if (!session.user.status) {
        return null
    }

    return session.userId
}

/**
 * 用户信息接口
 */
export interface AuthUser {
    id: number
    account: string
    name: string
    role: string
    status: boolean
    organizations: { id: number; name: string }[]
}

/**
 * 获取当前认证用户（不抛出错误）
 */
export async function getAuthUser(event: H3Event): Promise<AuthUser | null> {
    const token = getSessionToken(event)
    if (!token) {
        return null
    }

    const userId = await validateSession(token)
    if (!userId) {
        return null
    }

    try {
        const user = await db.user.findUnique({
            where: { id: userId },
            include: {
                organizations: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        })

        if (!user || !user.status) {
            return null
        }

        return {
            id: user.id,
            account: user.account,
            name: user.name,
            role: user.role,
            status: user.status,
            organizations: user.organizations
        }
    } catch {
        return null
    }
}

/**
 * 要求认证（如果未认证则抛出错误）
 */
export async function requireAuth(event: H3Event): Promise<AuthUser> {
    const user = await getAuthUser(event)

    if (!user) {
        throw createError({
            statusCode: 401,
            statusMessage: 'Unauthorized - Please login'
        })
    }

    return user
}

/**
 * 要求管理员权限
 */
export async function requireAdmin(event: H3Event): Promise<AuthUser> {
    const user = await requireAuth(event)

    if (!['super_admin', 'admin'].includes(user.role)) {
        throw createError({
            statusCode: 403,
            statusMessage: 'Forbidden - Admin access required'
        })
    }

    return user
}

/**
 * 要求超级管理员权限
 */
export async function requireSuperAdmin(event: H3Event): Promise<AuthUser> {
    const user = await requireAuth(event)

    if (user.role !== 'super_admin') {
        throw createError({
            statusCode: 403,
            statusMessage: 'Forbidden - Super admin access required'
        })
    }

    return user
}

/**
 * 检查用户是否属于指定组织
 */
export function isUserInOrganization(user: AuthUser, organizationId: number): boolean {
    return user.organizations.some(org => org.id === organizationId)
}

/**
 * 要求用户属于指定组织（或是管理员）
 */
export async function requireOrganizationAccess(event: H3Event, organizationId: number): Promise<AuthUser> {
    const user = await requireAuth(event)

    // 管理员可以访问所有组织
    if (['super_admin', 'admin'].includes(user.role)) {
        return user
    }

    // 普通用户必须属于该组织
    if (!isUserInOrganization(user, organizationId)) {
        throw createError({
            statusCode: 403,
            statusMessage: 'Forbidden - No access to this organization'
        })
    }

    return user
}
