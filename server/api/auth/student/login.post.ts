import { z } from 'zod'
import { db } from '../../../utils/prisma'
import {
    createStudentSession,
    setStudentSessionCookie
} from '../../../utils/auth'
import bcrypt from 'bcryptjs'
import { sendSuccess, handleError } from '../../../utils/api'

// 学生登录参数验证schema
const studentLoginSchema = z.object({
    account: z.string().min(1, '账号不能为空'),
    password: z.string().min(1, '密码不能为空')
})

/**
 * 学生账号密码登录API
 * 验证账号密码，检查状态，创建会话
 */
export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event)
        const validatedData = studentLoginSchema.parse(body)
        const { account, password } = validatedData

        // 查询学生账号
        const student = await db.student.findUnique({
            where: { account }
        })

        if (!student) {
            throw createError({
                statusCode: 401,
                statusMessage: '账号或密码错误'
            })
        }

        // 检查密码是否存在
        if (!student.password) {
            throw createError({
                statusCode: 401,
                statusMessage: '该账号未设置密码，请使用希沃登录'
            })
        }

        // 验证密码
        const isPasswordValid = await bcrypt.compare(
            password,
            student.password
        )
        if (!isPasswordValid) {
            throw createError({
                statusCode: 401,
                statusMessage: '账号或密码错误'
            })
        }

        // 检查学生状态
        if (student.status === 'disabled') {
            throw createError({
                statusCode: 403,
                statusMessage: '该账号已被禁用'
            })
        }

        // 创建会话
        const sessionToken = await createStudentSession(student.id)
        setStudentSessionCookie(event, sessionToken)

        return sendSuccess(event, {
            id: student.id,
            name: student.name,
            studentId: student.studentId,
            account: student.account,
            status: student.status
        }, '登录成功')
    } catch (error) {
        return handleError(error)
    }
})
