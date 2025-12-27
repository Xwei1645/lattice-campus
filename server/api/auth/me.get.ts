import { requireAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    // 使用统一的认证工具函数
    const user = await requireAuth(event)

    return {
        id: user.id,
        account: user.account,
        name: user.name,
        role: user.role,
        organizations: user.organizations
    }
})
