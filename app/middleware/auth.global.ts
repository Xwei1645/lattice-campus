export default defineNuxtRouteMiddleware(async (to, from) => {
    // 仅在客户端执行的逻辑
    if (import.meta.client) {
        const userStr = localStorage.getItem('user')

        // 1. 处理登录和注册页逻辑
        if (to.path === '/login' || to.path === '/register') {
            if (userStr) {
                try {
                    // 验证 session 是否有效并获取最新数据
                    const user = await $fetch('/api/auth/me')
                    localStorage.setItem('user', JSON.stringify(user))
                    return navigateTo('/')
                } catch {
                    localStorage.removeItem('user')
                }
            }
            return
        }

        // 2. 处理其他页面逻辑
        if (!userStr) {
            return navigateTo('/login')
        }

        try {
            const user = JSON.parse(userStr)

            // 权限控制
            const adminRoutes = [
                '/account-management', 
                '/organization-management', 
                '/room-management', 
                '/booking-management', 
                '/auto-approval',
                '/feedback-management',
                '/notice-management',
                '/invitation-code-management'
            ]
            if (adminRoutes.includes(to.path)) {
                if (!['root', 'super_admin', 'admin'].includes(user.role)) {
                    return navigateTo('/')
                }
            }

            // 异步刷新用户信息（不阻塞页面跳转）
            $fetch('/api/auth/me').then(latestUser => {
                localStorage.setItem('user', JSON.stringify(latestUser))
            }).catch((err) => {
                // 仅在 401  Unauthorized 时清理会话，避免网络波动导致自动登出
                if (err.statusCode === 401) {
                    localStorage.removeItem('user')
                    navigateTo('/login')
                }
            })
        } catch {
            localStorage.removeItem('user')
            return navigateTo('/login')
        }
    }
})
