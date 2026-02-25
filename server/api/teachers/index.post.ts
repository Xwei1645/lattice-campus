import { z } from 'zod'
import { db } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'
import bcrypt from 'bcryptjs'
import { sendSuccess, handleError } from '../../utils/api'

// 新增老师参数验证schema
const teacherCreateSchema = z.object({
    name: z.string().min(2, '姓名至少2个字符').max(20, '姓名最多20个字符'),
    account: z.string()
        .min(4, '账号至少4个字符')
        .max(20, '账号最多20个字符')
        .regex(/^[a-zA-Z0-9_]+$/, '账号只能包含字母、数字和下划线')
        .optional(),
    password: z.string()
        .min(6, '密码至少6个字符')
        .max(20, '密码最多20个字符')
        .optional(),
    organizationIds: z.array(z.number().int().positive())
        .min(1, '至少选择一个部门')
})

/**
 * 新增老师API
 * 管理员创建老师，状态为active
 */
export default defineEventHandler(async (event) => {
    try {
        // 验证管理员权限
        await requireAdmin(event)

        const body = await readBody(event)
        const validatedData = teacherCreateSchema.parse(body)
        const { name, account, password, organizationIds } = validatedData

        // 如果提供了账号，检查账号是否已存在
        if (account) {
            const existingTeacher = await db.teacher.findUnique({
                where: { account }
            })
            if (existingTeacher) {
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

        // 创建老师记录，状态为active
        const teacher = await db.teacher.create({
            data: {
                name,
                account: account || null,
                password: hashedPassword,
                status: 'active',
                organizations: {
                    create: organizationIds.map((orgId: number) => ({
                        organizationId: orgId
                    }))
                }
            },
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

        return sendSuccess(event, {
            id: teacher.id,
            name: teacher.name,
            account: teacher.account,
            status: teacher.status,
            createTime: teacher.createTime,
            organizations: teacher.organizations.map(to => ({
                id: to.organization.id,
                name: to.organization.name
            }))
        }, '老师创建成功')
    } catch (error) {
        return handleError(error)
    }
})
