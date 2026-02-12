import { z } from 'zod'
import { db } from '../../../utils/prisma'
import { verifyInitToken } from '../../../utils/auth'
import bcrypt from 'bcryptjs'
import { sendSuccess, handleError } from '../../../utils/api'

// 初始化参数验证schema
const initializeSchema = z.object({
    token: z.string().min(1, '初始化token不能为空'),
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
 * 老师首次钉钉登录初始化API
 * 验证初始化token，创建Teacher记录，关联部门
 */
export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event)
        const validatedData = initializeSchema.parse(body)
        const { token, name, account, password, organizationIds } = validatedData

        // 验证初始化token
        const tokenData = verifyInitToken(token)
        if (!tokenData || tokenData.type !== 'teacher') {
            throw createError({
                statusCode: 400,
                statusMessage: '无效的初始化token'
            })
        }

        const dingTalkOpenId = tokenData.openId

        // 检查该钉钉账号是否已初始化
        const existingTeacher = await db.teacher.findUnique({
            where: { dingTalkOpenId }
        })

        if (existingTeacher) {
            throw createError({
                statusCode: 400,
                statusMessage: '该钉钉账号已完成初始化'
            })
        }

        // 如果提供了账号，检查账号是否已存在
        if (account) {
            const existingAccount = await db.teacher.findUnique({
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

        // 创建老师记录，状态为pending（待审核）
        const teacher = await db.teacher.create({
            data: {
                name,
                account: account || null,
                password: hashedPassword,
                dingTalkOpenId,
                status: 'pending',
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
            organizations: teacher.organizations.map(to => ({
                id: to.organization.id,
                name: to.organization.name
            }))
        }, '老师信息初始化成功，请等待管理员审核')
    } catch (error) {
        return handleError(error)
    }
})
