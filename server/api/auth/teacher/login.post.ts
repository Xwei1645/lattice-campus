import { z } from 'zod'
import { db } from '../../../utils/prisma'
import { 
    createTeacherSession, 
    setTeacherSessionCookie 
} from '../../../utils/auth'
import bcrypt from 'bcryptjs'
import { sendSuccess, handleError } from '../../../utils/api'

// 登录参数验证schema
const loginSchema = z.object({
    account: z.string().min(1, '账号不能为空'),
    password: z.string().min(1, '密码不能为空')
})

/**
 * 老师账号密码登录API
 * 验证账号密码，检查状态，创建会话
 */
export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event)
        const validatedData = loginSchema.parse(body)
        const { account, password } = validatedData

        // 查询老师信息
        const teacher = await db.teacher.findUnique({
            where: { account },
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

        // 老师不存在
        if (!teacher) {
            throw createError({
                statusCode: 401,
                statusMessage: '账号或密码错误'
            })
        }

        // 检查是否设置了密码
        if (!teacher.password) {
            throw createError({
                statusCode: 401,
                statusMessage: '该账号未设置密码，请联系管理员'
            })
        }

        // 验证密码
        const isPasswordValid = await bcrypt.compare(password, teacher.password)
        if (!isPasswordValid) {
            throw createError({
                statusCode: 401,
                statusMessage: '账号或密码错误'
            })
        }

        // 检查老师状态
        if (teacher.status === 'pending') {
            throw createError({
                statusCode: 403,
                statusMessage: '账号待审核，请等待管理员审核通过'
            })
        }

        if (teacher.status === 'disabled') {
            throw createError({
                statusCode: 403,
                statusMessage: '账号已被禁用，请联系管理员'
            })
        }

        // 只有active状态才能登录
        if (teacher.status !== 'active') {
            throw createError({
                statusCode: 403,
                statusMessage: '账号状态异常，请联系管理员'
            })
        }

        // 创建会话
        const sessionToken = await createTeacherSession(teacher.id)
        
        // 设置会话cookie
        setTeacherSessionCookie(event, sessionToken)

        return sendSuccess(event, {
            id: teacher.id,
            account: teacher.account,
            name: teacher.name,
            status: teacher.status,
            organizations: teacher.organizations.map(to => ({
                id: to.organization.id,
                name: to.organization.name
            }))
        }, '登录成功')
    } catch (error) {
        return handleError(error)
    }
})
