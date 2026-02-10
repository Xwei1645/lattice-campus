import { ZodError } from 'zod'
import { createError, H3Event } from 'h3'

export interface ApiResponse<T = any> {
    success: boolean
    data?: T
    message?: string
    code?: string
}

/**
 * 成功响应格式化
 */
export function sendSuccess<T>(event: H3Event, data: T, message: string = 'Success', statusCode: number = 200): ApiResponse<T> {
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

    // 处理其他错误 (Prisma 等)
    console.error('[API Error]:', error)
    throw createError({
        statusCode: error.statusCode || 500,
        statusMessage: error.message || 'Internal Server Error',
        data: {
            success: false,
            message: error.message || '服务器内部错误'
        }
    })
}
