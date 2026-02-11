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
        const state = query.state as string

        if (!code) {
            return {
                success: false,
                message: '授权码缺失'
            }
        }

        // 验证 state 参数（CSRF 防护）
        const savedState = getCookie(event, 'dingtalk_state')
        if (!state || !savedState) {
            return {
                success: false,
                message: '授权状态已过期，请重新绑定'
            }
        }

        // 提取实际的 state 和 userId（绑定模式下 state 格式为 bind_userId_actualState）
        let actualState = state
        let userId: number | null = null
        if (state.startsWith('bind_')) {
            const parts = state.split('_')
            if (parts.length >= 3) {
                userId = parseInt(parts[1])
                actualState = parts.slice(2).join('_')
            }
        }

        if (actualState !== savedState) {
            return {
                success: false,
                message: '授权状态验证失败，请重新绑定'
            }
        }

        // 验证通过后清除 state cookie
        deleteCookie(event, 'dingtalk_state', { path: '/' })

        if (!userId || isNaN(userId)) {
            return {
                success: false,
                message: '用户ID无效'
            }
        }

        // 获取钉钉用户信息
        const dingInfo = await dingtalk.getUserInfoByCode(code)

        // 检查该钉钉账号是否已被其他用户绑定
        const existingUser = await db.user.findUnique({
            where: { dingTalkOpenId: dingInfo.openId }
        })

        if (existingUser && existingUser.id !== userId) {
            return {
                success: false,
                message: '该钉钉账号已被其他用户绑定'
            }
        }

        // 检查目标用户是否存在
        const targetUser = await db.user.findUnique({
            where: { id: userId }
        })

        if (!targetUser) {
            return {
                success: false,
                message: '用户不存在'
            }
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
                name: targetUser.name
            }
        }
    } catch (error: any) {
        console.error('[DingTalk Bind Error]:', error)

        if (error.statusCode === 401) {
            return {
                success: false,
                message: '请先登录管理员账号'
            }
        }

        if (error.statusCode === 403) {
            return {
                success: false,
                message: '无权限执行此操作'
            }
        }

        return {
            success: false,
            message: '绑定失败，请稍后重试'
        }
    }
})
