import { H3Event, createError } from 'h3'
import { db } from './prisma'
import crypto from 'crypto'

// Session配置
const SESSION_COOKIE_NAME = 'session_token'
const TEACHER_SESSION_COOKIE_NAME = 'teacher_session_token'
const STUDENT_SESSION_COOKIE_NAME = 'student_session_token'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7天（秒）

/**
 * 生成安全的session token
 */
export function generateSessionToken(): string {
    return crypto.randomBytes(32).toString('hex')
}

// ==================== 用户会话 ====================

/**
 * 创建用户会话并存入数据库
 * 登录时会销毁该用户的旧会话，防止会话固定攻击
 */
export async function createSession(userId: number): Promise<string> {
    // 先销毁该用户的所有旧会话（防止会话固定攻击）
    await destroyUserSessions(userId)

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
 * 销毁用户的所有会话
 * 用于登录时防止会话固定攻击
 */
export async function destroyUserSessions(userId: number): Promise<void> {
    try {
        await db.session.deleteMany({
            where: { userId }
        })
    } catch {
        // 忽略错误
    }
}

// ==================== 老师会话 ====================

/**
 * 创建老师会话并存入数据库
 */
export async function createTeacherSession(teacherId: number): Promise<string> {
    // 先销毁该老师的所有旧会话
    await destroyTeacherSessions(teacherId)

    const token = generateSessionToken()
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000)

    await db.teacherSession.create({
        data: {
            id: token,
            teacherId,
            expiresAt
        }
    })

    // 异步清理过期session
    cleanupExpiredTeacherSessions().catch(console.error)

    return token
}

/**
 * 销毁老师的所有会话
 */
export async function destroyTeacherSessions(teacherId: number): Promise<void> {
    try {
        await db.teacherSession.deleteMany({
            where: { teacherId }
        })
    } catch {
        // 忽略错误
    }
}

/**
 * 验证老师会话
 */
export async function validateTeacherSession(token: string): Promise<number | null> {
    const session = await db.teacherSession.findUnique({
        where: { id: token },
        include: { teacher: true }
    })

    if (!session) {
        return null
    }

    if (session.expiresAt < new Date()) {
        await db.teacherSession.delete({ where: { id: token } })
        return null
    }

    if (session.teacher.status !== 'active') {
        return null
    }

    return session.teacherId
}

// ==================== 学生会话 ====================

/**
 * 创建学生会话并存入数据库
 */
export async function createStudentSession(studentId: number): Promise<string> {
    // 先销毁该学生的所有旧会话
    await destroyStudentSessions(studentId)

    const token = generateSessionToken()
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000)

    await db.studentSession.create({
        data: {
            id: token,
            studentId,
            expiresAt
        }
    })

    // 异步清理过期session
    cleanupExpiredStudentSessions().catch(console.error)

    return token
}

/**
 * 销毁学生的所有会话
 */
export async function destroyStudentSessions(studentId: number): Promise<void> {
    try {
        await db.studentSession.deleteMany({
            where: { studentId }
        })
    } catch {
        // 忽略错误
    }
}

/**
 * 验证学生会话
 */
export async function validateStudentSession(token: string): Promise<number | null> {
    const session = await db.studentSession.findUnique({
        where: { id: token },
        include: { student: true }
    })

    if (!session) {
        return null
    }

    if (session.expiresAt < new Date()) {
        await db.studentSession.delete({ where: { id: token } })
        return null
    }

    if (session.student.status !== 'active') {
        return null
    }

    return session.studentId
}

// ==================== 清理过期会话 ====================

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
 * 清理过期的老师session
 */
async function cleanupExpiredTeacherSessions(): Promise<void> {
    await db.teacherSession.deleteMany({
        where: {
            expiresAt: {
                lt: new Date()
            }
        }
    })
}

/**
 * 清理过期的学生session
 */
async function cleanupExpiredStudentSessions(): Promise<void> {
    await db.studentSession.deleteMany({
        where: {
            expiresAt: {
                lt: new Date()
            }
        }
    })
}

// ==================== Cookie操作 ====================

/**
 * 从请求中获取session token
 */
export function getSessionToken(event: H3Event): string | undefined {
    return getCookie(event, SESSION_COOKIE_NAME)
}

/**
 * 从请求中获取老师session token
 */
export function getTeacherSessionToken(event: H3Event): string | undefined {
    return getCookie(event, TEACHER_SESSION_COOKIE_NAME)
}

/**
 * 从请求中获取学生session token
 */
export function getStudentSessionToken(event: H3Event): string | undefined {
    return getCookie(event, STUDENT_SESSION_COOKIE_NAME)
}

/**
 * 设置session cookie
 */
export function setSessionCookie(event: H3Event, token: string): void {
    setCookie(event, SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        // 开发环境下为 false，生产环境下建议开启
        secure: process.env.NODE_ENV === 'production' && 
            (event.node.req.headers['x-forwarded-proto'] === 'https' || 
            (event.node.req.socket as any).encrypted),
        sameSite: 'strict', // 改为 strict 增强安全性
        maxAge: SESSION_MAX_AGE,
        path: '/'
    })
}

/**
 * 设置老师session cookie
 */
export function setTeacherSessionCookie(event: H3Event, token: string): void {
    setCookie(event, TEACHER_SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production' && 
            (event.node.req.headers['x-forwarded-proto'] === 'https' || 
            (event.node.req.socket as any).encrypted),
        sameSite: 'strict',
        maxAge: SESSION_MAX_AGE,
        path: '/'
    })
}

/**
 * 设置学生session cookie
 */
export function setStudentSessionCookie(event: H3Event, token: string): void {
    setCookie(event, STUDENT_SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production' && 
            (event.node.req.headers['x-forwarded-proto'] === 'https' || 
            (event.node.req.socket as any).encrypted),
        sameSite: 'strict',
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
 * 清除老师session cookie
 */
export function clearTeacherSessionCookie(event: H3Event): void {
    deleteCookie(event, TEACHER_SESSION_COOKIE_NAME, {
        path: '/'
    })
}

/**
 * 清除学生session cookie
 */
export function clearStudentSessionCookie(event: H3Event): void {
    deleteCookie(event, STUDENT_SESSION_COOKIE_NAME, {
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
export function isUserInOrganization(
    user: AuthUser, 
    organizationId: number
): boolean {
    return user.organizations.some(org => org.id === organizationId)
}

/**
 * 要求用户属于指定组织（或是管理员）
 */
export async function requireOrganizationAccess(
    event: H3Event, 
    organizationId: number
): Promise<AuthUser> {
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

// ==================== 老师认证 ====================

/**
 * 老师信息接口
 */
export interface AuthTeacher {
    id: number
    account: string | null
    name: string
    status: string
    organizations: { id: number; name: string }[]
}

/**
 * 获取当前认证老师（不抛出错误）
 */
export async function getAuthTeacher(event: H3Event): Promise<AuthTeacher | null> {
    const token = getTeacherSessionToken(event)
    if (!token) {
        return null
    }

    const teacherId = await validateTeacherSession(token)
    if (!teacherId) {
        return null
    }

    try {
        const teacher = await db.teacher.findUnique({
            where: { id: teacherId },
            include: {
                organizations: {
                    include: {
                        organization: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                }
            }
        })

        if (!teacher || teacher.status !== 'active') {
            return null
        }

        return {
            id: teacher.id,
            account: teacher.account,
            name: teacher.name,
            status: teacher.status,
            organizations: teacher.organizations.map(to => ({
                id: to.organization.id,
                name: to.organization.name
            }))
        }
    } catch {
        return null
    }
}

/**
 * 要求老师认证（如果未认证则抛出错误）
 */
export async function requireTeacherAuth(event: H3Event): Promise<AuthTeacher> {
    const teacher = await getAuthTeacher(event)

    if (!teacher) {
        throw createError({
            statusCode: 401,
            statusMessage: 'Unauthorized - Please login as teacher'
        })
    }

    return teacher
}

// ==================== 学生认证 ====================

/**
 * 学生信息接口
 */
export interface AuthStudent {
    id: number
    account: string | null
    name: string
    studentId: string
    status: string
}

/**
 * 获取当前认证学生（不抛出错误）
 */
export async function getAuthStudent(event: H3Event): Promise<AuthStudent | null> {
    const token = getStudentSessionToken(event)
    if (!token) {
        return null
    }

    const studentId = await validateStudentSession(token)
    if (!studentId) {
        return null
    }

    try {
        const student = await db.student.findUnique({
            where: { id: studentId }
        })

        if (!student || student.status !== 'active') {
            return null
        }

        return {
            id: student.id,
            account: student.account,
            name: student.name,
            studentId: student.studentId,
            status: student.status
        }
    } catch {
        return null
    }
}

/**
 * 要求学生认证（如果未认证则抛出错误）
 */
export async function requireStudentAuth(event: H3Event): Promise<AuthStudent> {
    const student = await getAuthStudent(event)

    if (!student) {
        throw createError({
            statusCode: 401,
            statusMessage: 'Unauthorized - Please login as student'
        })
    }

    return student
}

// ==================== 初始化Token ====================

// 初始化Token有效期（5分钟）
const INIT_TOKEN_EXPIRY = 5 * 60 * 1000

/**
 * 创建初始化Token（用于首次登录）
 * 包含时间戳，有效期5分钟
 */
export function createInitToken(openId: string, type: 'teacher' | 'student'): string {
    const randomState = crypto.randomBytes(16).toString('hex')
    const timestamp = Date.now().toString(36)
    const secret = process.env.STATE_SECRET || 'init-token-secret'
    const data = `${type}:${openId}:${randomState}:${timestamp}`
    const signature = crypto
        .createHmac('sha256', secret)
        .update(data)
        .digest('hex')
        .substring(0, 32)
    return `${type}_${openId}_${randomState}_${timestamp}_${signature}`
}

/**
 * 验证初始化Token
 * 检查签名和过期时间
 */
export function verifyInitToken(token: string): { type: 'teacher' | 'student'; openId: string } | null {
    const parts = token.split('_')
    if (parts.length !== 5) return null

    const [type, openId, randomState, timestamp, signature] = parts as [
        'teacher' | 'student', string, string, string, string
    ]
    
    if (type !== 'teacher' && type !== 'student') return null

    // 验证过期时间
    const tokenTime = parseInt(timestamp, 36)
    if (isNaN(tokenTime) || Date.now() - tokenTime > INIT_TOKEN_EXPIRY) {
        return null
    }

    const secret = process.env.STATE_SECRET || 'init-token-secret'
    const data = `${type}:${openId}:${randomState}:${timestamp}`
    const expected = crypto
        .createHmac('sha256', secret)
        .update(data)
        .digest('hex')
        .substring(0, 32)

    // 防止时序攻击
    if (signature.length !== expected.length) return null
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
        return null
    }

    return { type, openId }
}
