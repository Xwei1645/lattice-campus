import { H3Event } from 'h3'
import { db } from './prisma'
import type { AuthUser } from './auth'

export type AuditActionType =
  | 'login'
  | 'logout'
  | 'register'
  | 'dingtalk_login'
  | 'user_create'
  | 'user_update'
  | 'user_delete'
  | 'user_reset_password'
  | 'booking_create'
  | 'booking_update'
  | 'booking_cancel'
  | 'organization_create'
  | 'organization_delete'
  | 'room_create'
  | 'room_delete'
  | 'notice_create'
  | 'notice_delete'

export interface AuditLogOptions {
  actionType: AuditActionType
  userId?: number
  userName?: string
  userRole?: string
  targetId?: number
  targetType?: string
  details?: Record<string, any>
  status?: 'success' | 'failed'
  errorMessage?: string
}

function getClientInfo(event: H3Event): { ipAddress: string; userAgent: string } {
  const headers = event.node.req.headers
  
  const ipAddress = (headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
                   headers['x-real-ip'] as string ||
                   event.node.req.socket.remoteAddress ||
                   'unknown'

  const userAgent = headers['user-agent'] || 'unknown'

  return { ipAddress, userAgent }
}

export async function logAction(event: H3Event, options: AuditLogOptions): Promise<void> {
  const { ipAddress, userAgent } = getClientInfo(event)

  try {
    await (db as any).auditLog.create({
      data: {
        actionType: options.actionType,
        userId: options.userId,
        userName: options.userName,
        userRole: options.userRole,
        targetId: options.targetId,
        targetType: options.targetType,
        details: options.details ? JSON.stringify(options.details) : null,
        ipAddress,
        userAgent,
        status: options.status || 'success',
        errorMessage: options.errorMessage
      }
    })
  } catch (error) {
    console.error('[Audit Log Error]:', error)
  }
}

export async function logLogin(event: H3Event, user: AuthUser, method: 'password' | 'dingtalk' = 'password'): Promise<void> {
  await logAction(event, {
    actionType: method === 'dingtalk' ? 'dingtalk_login' : 'login',
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    details: {
      account: user.account,
      method
    },
    status: 'success'
  })
}

export async function logLoginFailed(event: H3Event, account: string, errorMessage: string, method: 'password' | 'dingtalk' = 'password'): Promise<void> {
  await logAction(event, {
    actionType: method === 'dingtalk' ? 'dingtalk_login' : 'login',
    userName: account,
    details: {
      account,
      method
    },
    status: 'failed',
    errorMessage
  })
}

export async function logLogout(event: H3Event, user: AuthUser): Promise<void> {
  await logAction(event, {
    actionType: 'logout',
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    details: {
      account: user.account
    },
    status: 'success'
  })
}

export async function logRegister(event: H3Event, account: string, name: string, role: string): Promise<void> {
  await logAction(event, {
    actionType: 'register',
    userName: name,
    userRole: role,
    details: {
      account,
      name,
      role
    },
    status: 'success'
  })
}

export async function logSensitiveAction(
  event: H3Event,
  actionType: AuditActionType,
  currentUser: AuthUser,
  targetId?: number,
  targetType?: string,
  details?: Record<string, any>,
  status: 'success' | 'failed' = 'success',
  errorMessage?: string
): Promise<void> {
  await logAction(event, {
    actionType,
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    targetId,
    targetType,
    details,
    status,
    errorMessage
  })
}
