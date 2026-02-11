import { ZodError } from 'zod'
import { createError, H3Event } from 'h3'

export interface ApiResponse<T = any> {
    success: boolean
    data?: T
    message?: string
    code?: string
}

// 敏感字段列表
const SENSITIVE_FIELDS = [
    'password',
    'token',
    'secret',
    'key',
    'credential',
    'authorization',
    'cookie',
    'session'
]

/**
 * 过滤敏感信息
 * 递归处理对象，将敏感字段的值替换为 ***
 */
function filterSensitiveInfo(obj: any, depth: number = 0): any {
    // 防止循环引用和过深递归
    if (depth > 5) {
        return '[Max Depth Reached]'
    }

    if (obj === null || obj === undefined) {
        return obj
    }

    if (typeof obj !== 'object') {
        return obj
    }

    // 处理数组
    if (Array.isArray(obj)) {
        return obj.map(item => 
            filterSensitiveInfo(item, depth + 1)
        )
    }

    // 处理对象
    const filtered: any = {}
    for (const key of Object.keys(obj)) {
        const lowerKey = key.toLowerCase()
        
        // 检查是否为敏感字段
        const isSensitive = SENSITIVE_FIELDS.some(field => 
            lowerKey.includes(field)
        )

        if (isSensitive) {
            filtered[key] = '***'
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            filtered[key] = filterSensitiveInfo(obj[key], depth + 1)
        } else {
            filtered[key] = obj[key]
        }
    }

    return filtered
}

/**
 * 结构化日志输出
 */
function structuredLog(
    level: 'error' | 'warn' | 'info',
    category: string,
    data: any
): void {
    const timestamp = new Date().toISOString()
    const filteredData = filterSensitiveInfo(data)
    
    const logEntry = {
        timestamp,
        level,
        category,
        ...filteredData
    }

    console.log(JSON.stringify(logEntry))
}

/**
 * 成功响应格式化
 */
export function sendSuccess<T>(
    event: H3Event, 
    data: T, 
    message: string = 'Success', 
    statusCode: number = 200
): ApiResponse<T> {
    setResponseStatus(event, statusCode)
    return {
        success: true,
        data,
        message
    }
}

/**
 * 错误处理工具
 */
export function handleError(error: any) {
    // 如果已经是 H3 错误，直接抛出
    if (error.statusCode) {
        throw error
    }

    // 处理 Zod 校验错误
    if (error instanceof ZodError) {
        // 记录验证错误（不包含敏感数据）
        structuredLog('warn', 'Validation', {
            errorCount: error.issues.length,
            errors: error.issues.map(e => ({
                path: e.path.join('.'),
                message: e.message
            }))
        })

        throw createError({
            statusCode: 400,
            statusMessage: 'Validation Error',
            data: {
                success: false,
                message: '数据格式校验失败',
                errors: error.issues
            }
        })
    }

    // 处理其他错误
    // 判断是否为生产环境
    const isProduction = process.env.NODE_ENV === 'production'
    
    // 记录错误日志（过滤敏感信息）
    structuredLog('error', 'API', {
        errorType: error.constructor?.name || 'Unknown',
        message: error.message,
        // 生产环境不记录堆栈信息
        stack: isProduction ? undefined : error.stack
    })

    // 生产环境返回通用错误消息
    const errorMessage = isProduction 
        ? '服务器内部错误，请稍后重试' 
        : error.message || '服务器内部错误'

    throw createError({
        statusCode: error.statusCode || 500,
        statusMessage: isProduction ? 'Internal Server Error' : error.message,
        data: {
            success: false,
            message: errorMessage
        }
    })
}

/**
 * 安全日志记录工具
 * 用于记录业务日志，自动过滤敏感信息
 */
export const logger = {
    error(category: string, data: any): void {
        structuredLog('error', category, data)
    },
    warn(category: string, data: any): void {
        structuredLog('warn', category, data)
    },
    info(category: string, data: any): void {
        structuredLog('info', category, data)
    }
}
