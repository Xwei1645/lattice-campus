import pino from 'pino'
import type { H3Event } from 'h3'
import crypto from 'crypto'

const LOG_LEVEL = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug')

const REDACT_PATHS = [
    'req.headers.authorization',
    'req.headers.cookie',
    'request.headers.authorization',
    'request.headers.cookie',
    '*.password',
    '*.token',
    '*.secret',
    '*.authorization',
    '*.cookie',
    '*.session'
]

export const appLogger = pino({
    level: LOG_LEVEL,
    base: {
        service: 'wzhs-booking',
        env: process.env.NODE_ENV || 'development'
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
        paths: REDACT_PATHS,
        censor: '***'
    },
    formatters: {
        level(label) {
            return { level: label }
        }
    }
})

export const auditLogger = appLogger.child({
    loggerType: 'audit'
})

export function generateRequestId(): string {
    return crypto.randomUUID()
}

export function getRequestId(event: H3Event): string {
    const contextRequestId = (event.context as any).requestId
    if (typeof contextRequestId === 'string' && contextRequestId.length > 0) {
        return contextRequestId
    }

    const headerRequestId = getHeader(event, 'x-request-id')
    if (headerRequestId) {
        return headerRequestId
    }

    return generateRequestId()
}

export function getClientIp(event: H3Event): string {
    const forwarded = getHeader(event, 'x-forwarded-for')
    const realIp = getHeader(event, 'x-real-ip')
    const socketIp = event.node.req.socket.remoteAddress
    return forwarded?.split(',')[0]?.trim() || realIp || socketIp || 'unknown'
}

export function getUserAgent(event: H3Event): string {
    return getHeader(event, 'user-agent') || 'unknown'
}

export function getRequestLogger(event: H3Event) {
    const contextLogger = (event.context as any).logger
    if (contextLogger) {
        return contextLogger
    }

    return appLogger.child({
        requestId: getRequestId(event),
        method: event.method,
        path: event.path
    })
}
