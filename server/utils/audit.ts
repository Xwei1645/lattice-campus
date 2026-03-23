import type { H3Event } from 'h3'
import { getAuthUser } from './auth'
import { auditLogger, getClientIp, getRequestId, getUserAgent } from './logger'

interface AuditInput {
    action: string
    resourceType: string
    resourceId?: string | number | null
    result: 'success' | 'failed'
    reason?: string
    before?: Record<string, any> | null
    after?: Record<string, any> | null
    changedFields?: string[]
}

export async function logAudit(event: H3Event, input: AuditInput): Promise<void> {
    const user = await getAuthUser(event)

    auditLogger.info({
        requestId: getRequestId(event),
        timestamp: new Date().toISOString(),
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId || null,
        result: input.result,
        reason: input.reason,
        changedFields: input.changedFields || [],
        before: input.before || null,
        after: input.after || null,
        endpoint: event.path,
        method: event.method,
        ip: getClientIp(event),
        userAgent: getUserAgent(event),
        actorUserId: user?.id || null,
        actorAccount: user?.account || null,
        actorName: user?.name || null,
        actorRole: user?.role || null,
        actorOrganizationIds: user?.organizations?.map(org => org.id) || []
    }, 'audit.detail')
}
