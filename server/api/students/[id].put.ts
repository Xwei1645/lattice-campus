import { z } from 'zod'
import { db } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'
import { sendSuccess, handleError } from '../../utils/api'

// 更新学生参数验证schema
const studentUpdateSchema = z.object({
    name: z.string().min(2, '姓名至少2个字符').max(20, '姓名最多20个字符'),
    studentId: z.string().min(1, '学号不能为空').max(50, '学号最多50个字符'),
    account: z.string()
        .min(4, '账号至少4个字符')
        .max(20, '账号最多20个字符')
        .regex(/^[a-zA-Z0-9_]+$/, '账号只能包含字母、数字和下划线')
        .optional()
        .nullable()
})

/**
 * 更新学生API
 * 更新学生基本信息
 */
export default defineEventHandler(async (event) => {
    try {
        // 验证管理员权限
        await requireAdmin(event)

        // 获取路由参数中的学生ID
        const id = getRouterParam(event, 'id')
        if (!id) {
            throw createError({
                statusCode: 400,
                statusMessage: '缺少学生ID'
            })
        }

        const studentIdParam = parseInt(id)
        if (isNaN(studentIdParam)) {
            throw createError({
                statusCode: 400,
                statusMessage: '无效的学生ID'
            })
        }

        // 检查学生是否存在
        const existingStudent = await db.student.findUnique({
            where: { id: studentIdParam }
        })

        if (!existingStudent) {
            throw createError({
                statusCode: 404,
                statusMessage: '学生不存在'
            })
        }

        const body = await readBody(event)
        const validatedData = studentUpdateSchema.parse(body)
        const { name, studentId, account } = validatedData

        // 检查学号是否已被其他学生使用
        if (studentId !== existingStudent.studentId) {
            const studentIdOwner = await db.student.findUnique({
                where: { studentId }
            })
            if (studentIdOwner) {
                throw createError({
                    statusCode: 400,
                    statusMessage: '该学号已被其他学生使用'
                })
            }
        }

        // 如果提供了账号，检查账号是否已被其他学生使用
        if (account && account !== existingStudent.account) {
            const accountOwner = await db.student.findUnique({
                where: { account }
            })
            if (accountOwner) {
                throw createError({
                    statusCode: 400,
                    statusMessage: '该账号已被其他学生使用'
                })
            }
        }

        // 更新学生信息
        const student = await db.student.update({
            where: { id: studentIdParam },
            data: {
                name,
                studentId,
                account: account || null
            }
        })

        return sendSuccess(event, {
            id: student.id,
            name: student.name,
            studentId: student.studentId,
            account: student.account,
            status: student.status,
            createTime: student.createTime
        }, '学生信息更新成功')
    } catch (error) {
        return handleError(error)
    }
})
