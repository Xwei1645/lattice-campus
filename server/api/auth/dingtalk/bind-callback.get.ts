import { db } from '../../../utils/prisma'
import { requireAdmin } from '../../../utils/auth'
import { dingtalk } from '../../../utils/dingtalk'

/**
 * 钉钉绑定回调 API
 * 用于处理管理员为用户绑定钉钉账号的流程
 */
export default defineEventHandler(async (event) => {
    try {
        // 验证管理员权限
        await requireAdmin(event)

        const query = getQuery(event)
        const code = query.code as string || query.authCode as string
        const userId = parseInt(query.userId as string)

        if (!code) {
            throw createError({
                statusCode: 400,
                statusMessage: '授权码缺失'
            })
        }

        if (!userId || isNaN(userId)) {
            throw createError({
                statusCode: 400,
                statusMessage: '用户ID无效'
            })
        }

        // 获取钉钉用户信息
        const dingInfo = await dingtalk.getUserInfoByCode(code)

        // 检查该钉钉账号是否已被其他用户绑定
        const existingUser = await db.user.findUnique({
            where: { dingTalkOpenId: dingInfo.openId }
        })

        if (existingUser && existingUser.id !== userId) {
            throw createError({
                statusCode: 400,
                statusMessage: `该钉钉账号已被用户 ${existingUser.account} 绑定`
            })
        }

        // 检查目标用户是否存在
        const targetUser = await db.user.findUnique({
            where: { id: userId }
        })

        if (!targetUser) {
            throw createError({
                statusCode: 404,
                statusMessage: '用户不存在'
            })
        }

        // 执行绑定
        await db.user.update({
            where: { id: userId },
            data: { dingTalkOpenId: dingInfo.openId }
        })

        return {
            success: true,
            message: '绑定成功',
            user: {
                id: targetUser.id,
                account: targetUser.account,
                name: targetUser.name,
                dingTalkOpenId: dingInfo.openId
            }
        }
    } catch (error: any) {
        console.error('[DingTalk Bind Error]:', error)
        
        if (error.statusCode) {
            throw error
        }
        
        throw createError({
            statusCode: 500,
            statusMessage: '绑定失败: ' + (error.message || '未知错误')
        })
    }
})
