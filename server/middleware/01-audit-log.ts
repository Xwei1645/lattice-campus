import { defineEventHandler } from 'h3'
import { getAuthUser } from '../utils/auth'
import { auditLogger, getClientIp, getRequestId, getUserAgent } from '../utils/logger'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])
const EXCLUDED_PATH_PREFIX = ['/api/csrf-token']

function shouldAudit(path: string, method: string): boolean {
    if (!path.startsWith('/api/')) {
        return false
    }
    if (SAFE_METHODS.has(method)) {
        return false
    }
    return !EXCLUDED_PATH_PREFIX.some(prefix => path.startsWith(prefix))
}

function normalizeResource(path: string): string {
    const segments = path.replace(/^\/api\//, '').split('/').filter(Boolean)
    return segments[0] || 'unknown'
}

function normalizeAction(path: string, method: string): string {
    const segments = path.replace(/^\/api\//, '').split('/').filter(Boolean)
    const resource = segments[0] || 'unknown'
    const lastSegment = segments[segments.length - 1] || ''

    const explicitActions = new Set([
        'create',
        'update',
        'delete',
        'bind-dingtalk',
        'unbind-dingtalk',
        'login',
        'logout',
        'register'
    ])

    if (explicitActions.has(lastSegment)) {
        return `${resource}.${lastSegment}`
    }

    if (method === 'POST') {
        return `${resource}.post`
    }
    if (method === 'PUT' || method === 'PATCH') {
        return `${resource}.update`
    }
    if (method === 'DELETE') {
        return `${resource}.delete`
    }

    return `${resource}.${method.toLowerCase()}`
}

export default defineEventHandler((event) => {
    if (!shouldAudit(event.path, event.method)) {
        return
    }

    event.node.res.on('finish', () => {
        const statusCode = event.node.res.statusCode || 200
        const durationMs = Date.now() - (((event.context as any).requestStartTime as number) || Date.now())

        void getAuthUser(event)
            .then((user) => {
                auditLogger.info({
                    requestId: getRequestId(event),
                    timestamp: new Date().toISOString(),
                    action: normalizeAction(event.path, event.method),
                    resourceType: normalizeResource(event.path),
                    endpoint: event.path,
                    method: event.method,
                    result: statusCode >= 400 ? 'failed' : 'success',
                    statusCode,
                    durationMs,
                    actorUserId: user?.id || null,
                    actorAccount: user?.account || null,
                    actorName: user?.name || null,
                    actorRole: user?.role || null,
                    actorOrganizationIds: user?.organizations?.map(org => org.id) || [],
                    ip: getClientIp(event),
                    userAgent: getUserAgent(event)
                }, 'audit.event')
            })
            .catch((error) => {
                auditLogger.warn({
                    requestId: getRequestId(event),
                    endpoint: event.path,
                    method: event.method,
                    statusCode,
                    message: error instanceof Error ? error.message : 'Unknown audit logging error'
                }, 'audit.resolve-user.failed')
            })
    })
})
