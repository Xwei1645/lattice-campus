import { defineEventHandler } from 'h3'
import { appLogger, generateRequestId, getClientIp, getUserAgent } from '../utils/logger'

export default defineEventHandler((event) => {
    const requestId = getHeader(event, 'x-request-id') || generateRequestId()
    const startTime = Date.now()

    ;(event.context as any).requestId = requestId
    ;(event.context as any).requestStartTime = startTime
    ;(event.context as any).logger = appLogger.child({
        requestId,
        method: event.method,
        path: event.path
    })

    setResponseHeader(event, 'x-request-id', requestId)

    event.node.res.on('finish', () => {
        const durationMs = Date.now() - startTime
        const statusCode = event.node.res.statusCode || 200
        const payload = {
            requestId,
            method: event.method,
            path: event.path,
            statusCode,
            durationMs,
            ip: getClientIp(event),
            userAgent: getUserAgent(event)
        }

        if (statusCode >= 500) {
            appLogger.error(payload, 'request.completed')
            return
        }

        if (statusCode >= 400) {
            appLogger.warn(payload, 'request.completed')
            return
        }

        appLogger.info(payload, 'request.completed')
    })
})
