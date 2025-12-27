export default defineNuxtRouteMiddleware(async (to, from) => {
    // 登录页不需要验证
    if (to.path === '/login') {
        // 如果已经登录，跳转到首页
        const userStr = import.meta.client ? localStorage.getItem('user') : null
        if (userStr) {
            try {
                // 验证session是否仍然有效
                await $fetch('/api/auth/me')
                return navigateTo('/')
            } catch {
                // session无效，清除本地存储
                if (import.meta.client) {
                    localStorage.removeItem('user')
                }
            }
        }
        return
    }

    // 客户端：检查本地存储
    if (import.meta.client) {
        const userStr = localStorage.getItem('user')
        if (!userStr) {
            return navigateTo('/login')
        }

        try {
            const user = JSON.parse(userStr)
            
            // 权限控制：用户管理和组织管理仅限管理员
            const adminRoutes = ['/account-management', '/organization-management']
            if (adminRoutes.includes(to.path)) {
                if (!['root', 'super_admin', 'admin'].includes(user.role)) {
                    return navigateTo('/')
                }
            }
        } catch {
            localStorage.removeItem('user')
            return navigateTo('/login')
        }
    }
})
