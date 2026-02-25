import { z } from 'zod'
import { db } from '../../../utils/prisma'
import { verifyInitToken, createStudentSession, setStudentSessionCookie } from '../../../utils/auth'
import bcrypt from 'bcryptjs'
import { sendSuccess, handleError } from '../../../utils/api'

// 学生初始化参数验证schema
const studentInitSchema = z.object({
    token: z.string().min(1, '初始化token不能为空'),
    name: z.string().min(2, '姓名至少2个字符').max(20, '姓名最多20个字符'),
    studentId: z.string().min(1, '学号不能为空').max(50, '学号最多50个字符'),
    account: z.string()
        .min(4, '账号至少4个字符')
        .max(20, '账号最多20个字符')
        .regex(/^[a-zA-Z0-9_]+$/, '账号只能包含字母、数字和下划线')
        .optional(),
    password: z.string()
        .min(6, '密码至少6个字符')
        .max(20, '密码最多20个字符')
        .optional()
})

/**
 * 学生首次希沃登录初始化API
 * 验证初始化token，创建Student记录，status为active
 * 初始化成功后自动创建会话
 */
export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event)
        const validatedData = studentInitSchema.parse(body)
        const { token, name, studentId, account, password } = validatedData

        // 验证初始化token
        const tokenData = verifyInitToken(token)
        if (!tokenData || tokenData.type !== 'student') {
            throw createError({
                statusCode: 400,
                statusMessage: '初始化token无效或已过期'
            })
        }

        const seewoOpenId = tokenData.openId

        // 检查该希沃账号是否已绑定其他学生
        const existingSeewoStudent = await db.student.findUnique({
            where: { seewoOpenId }
        })
        if (existingSeewoStudent) {
            throw createError({
                statusCode: 400,
                statusMessage: '该希沃账号已绑定其他学生'
            })
        }

        // 检查学号是否已存在
        const existingStudent = await db.student.findUnique({
            where: { studentId }
        })
        if (existingStudent) {
            throw createError({
                statusCode: 400,
                statusMessage: '该学号已被使用'
            })
        }

        // 如果提供了账号，检查账号是否已存在
        if (account) {
            const existingAccount = await db.student.findUnique({
                where: { account }
            })
            if (existingAccount) {
                throw createError({
                    statusCode: 400,
                    statusMessage: '该账号已被使用'
                })
            }
        }

        // 加密密码（如果提供）
        const hashedPassword = password
            ? await bcrypt.hash(password, 10)
            : null

        // 创建学生记录，status为active（学生无需审核）
        const student = await db.student.create({
            data: {
                name,
                studentId,
                account: account || null,
                password: hashedPassword,
                seewoOpenId,
                status: 'active'
            }
        })

        // 创建会话并设置cookie
        const sessionToken = await createStudentSession(student.id)
        setStudentSessionCookie(event, sessionToken)

        return sendSuccess(event, {
            id: student.id,
            name: student.name,
            studentId: student.studentId,
            account: student.account,
            status: student.status,
            createTime: student.createTime
        }, '学生账号初始化成功')
    } catch (error) {
        return handleError(error)
    }
})
