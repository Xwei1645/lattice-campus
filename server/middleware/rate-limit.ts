import { createError, defineEventHandler, H3Event } from 'h3'

// 速率限制配置接口
interface RateLimitConfig {
    windowMs: number      // 时间窗口（毫秒）
    maxRequests: number   // 最大请求数
    message?: string      // 自定义错误消息
}

// 请求记录
interface RequestRecord {
    count: number
    resetTime: number
}

// 存储请求记录（生产环境应使用 Redis）
const requestStore = new Map<string, RequestRecord>()

// 需要速率限制的路径配置
const RATE_LIMIT_RULES: Record<string, RateLimitConfig> = {
    // 登录接口：每分钟最多5次
    '/api/auth/login': {
        windowMs: 60 * 1000,
        maxRequests: 5,
        message: '登录尝试次数过多，请稍后再试'
    },
    // 注册接口：每小时最多3次
    '/api/auth/register': {
        windowMs: 60 * 60 * 1000,
        maxRequests: 3,
        message: '注册请求过于频繁，请稍后再试'
    },
    // 密码重置：每小时最多3次
    '/api/users': {
        windowMs: 60 * 60 * 1000,
        maxRequests: 10,
        message: '操作过于频繁，请稍后再试'
    },
    // 邀请码创建：每小时最多10次
    '/api/invitation-codes/create': {
        windowMs: 60 * 60 * 1000,
        maxRequests: 10,
        message: '创建邀请码次数过多，请稍后再试'
    }
}

/**
 * 获取客户端标识
 * 使用IP地址作为标识
 */
function getClientIdentifier(event: H3Event): string {
    // 获取真实IP（考虑代理）
    const forwarded = getHeader(event, 'x-forwarded-for')
    const realIp = getHeader(event, 'x-real-ip')
    const socketIp = event.node.req.socket.remoteAddress
    
    // 优先使用代理转发的IP
    const ip = forwarded?.split(',')[0]?.trim() || realIp || socketIp || 'unknown'
    return ip
}

/**
 * 检查是否需要速率限制
 */
function getRateLimitConfig(path: string): RateLimitConfig | null {
    for (const [pattern, config] of Object.entries(RATE_LIMIT_RULES)) {
        if (path.startsWith(pattern)) {
            return config
        }
    }
    return null
}

/**
 * 清理过期的请求记录
 */
function cleanupExpiredRecords(): void {
    const now = Date.now()
    for (const [key, record] of requestStore.entries()) {
        if (record.resetTime < now) {
            requestStore.delete(key)
        }
    }
}

// 定期清理过期记录
setInterval(cleanupExpiredRecords, 60 * 1000)

/**
 * 速率限制中间件
 */
export default defineEventHandler(async (event: H3Event) => {
    const path = event.path
    const method = event.method

    // 只对非安全方法进行速率限制
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
        return
    }

    // 检查是否需要速率限制
    const config = getRateLimitConfig(path)
    if (!config) {
        return
    }

    const clientId = getClientIdentifier(event)
    const key = `${clientId}:${path}`
    const now = Date.now()

    // 获取或创建请求记录
    let record = requestStore.get(key)

    if (!record || record.resetTime < now) {
        // 创建新记录
        record = {
            count: 0,
            resetTime: now + config.windowMs
        }
    }

    // 增加请求计数
    record.count++
    requestStore.set(key, record)

    // 设置响应头
    event.node.res.setHeader('X-RateLimit-Limit', config.maxRequests.toString())
    event.node.res.setHeader('X-RateLimit-Remaining', 
        Math.max(0, config.maxRequests - record.count).toString())
    event.node.res.setHeader('X-RateLimit-Reset', 
        Math.ceil(record.resetTime / 1000).toString())

    // 检查是否超过限制
    if (record.count > config.maxRequests) {
        const retryAfter = Math.ceil((record.resetTime - now) / 1000)
        event.node.res.setHeader('Retry-After', retryAfter.toString())

        throw createError({
            statusCode: 429,
            statusMessage: 'Too Many Requests',
            data: {
                success: false,
                message: config.message || '请求过于频繁，请稍后再试',
                retryAfter
            }
        })
    }
})
