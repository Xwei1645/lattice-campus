export default defineNuxtRouteMiddleware((to, from) => {
    const userInfo = useCookie<any>('userInfo')

    // 如果访问的不是登录页，且没有用户信息，则跳转到登录页
    if (to.path !== '/login' && !userInfo.value) {
        return navigateTo('/login')
    }

    // 如果已经登录，访问登录页则跳转到首页
    if (to.path === '/login' && userInfo.value) {
        return navigateTo('/')
    }

    // 权限控制：用户管理和组织管理仅限管理员和超级管理员
    const adminRoutes = ['/account-management', '/organization-management']
    if (adminRoutes.includes(to.path)) {
        const role = userInfo.value?.role
        if (role !== 'admin' && role !== 'super_admin') {
            return navigateTo('/')
        }
    }
})
