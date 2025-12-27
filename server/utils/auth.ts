import { H3Event, createError } from 'h3'
import { db } from './prisma'
import crypto from 'crypto'

// Session存储（生产环境应使用Redis等持久化存储）
const sessions = new Map<string, { userId: number; expiresAt: number }>()

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
 * 创建用户会话
 */
export function createSession(userId: number): string {
    const token = generateSessionToken()
    const expiresAt = Date.now() + SESSION_MAX_AGE * 1000

    sessions.set(token, { userId, expiresAt })

    // 清理过期session
    cleanupExpiredSessions()

    return token
}

/**
 * 删除会话
 */
export function deleteSession(token: string): void {
    sessions.delete(token)
}

/**
 * 清理过期的session
 */
function cleanupExpiredSessions(): void {
    const now = Date.now()
    for (const [token, session] of sessions) {
        if (session.expiresAt < now) {
            sessions.delete(token)
        }
    }
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
export function validateSession(token: string): number | null {
    const session = sessions.get(token)
    if (!session) {
        return null
    }

    if (session.expiresAt < Date.now()) {
        sessions.delete(token)
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

    const userId = validateSession(token)
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

    if (!['root', 'super_admin', 'admin'].includes(user.role)) {
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

    if (!['root', 'super_admin'].includes(user.role)) {
        throw createError({
            statusCode: 403,
            statusMessage: 'Forbidden - Super admin access required'
        })
    }

    return user
}

/**
 * 要求根管理员权限
 */
export async function requireRoot(event: H3Event): Promise<AuthUser> {
    const user = await requireAuth(event)

    if (user.role !== 'root') {
        throw createError({
            statusCode: 403,
            statusMessage: 'Forbidden - Root admin access required'
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
    if (['root', 'super_admin', 'admin'].includes(user.role)) {
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
