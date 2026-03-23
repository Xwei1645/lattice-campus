import { appLogger, getClientIp, getRequestId, getUserAgent } from '../utils/logger'

export default defineNitroPlugin((nitroApp) => {
    nitroApp.hooks.hook('error', (error, { event }) => {
        appLogger.error({
            requestId: event ? getRequestId(event) : undefined,
            method: event?.method,
            path: event?.path,
            ip: event ? getClientIp(event) : undefined,
            userAgent: event ? getUserAgent(event) : undefined,
            errorName: error?.name || 'Error',
            errorMessage: error?.message || 'Unknown error',
            stack: process.env.NODE_ENV === 'production' ? undefined : error?.stack
        }, 'request.error')
    })
})
