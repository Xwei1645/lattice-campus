import { getSessionToken, deleteSession, clearSessionCookie } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    const token = getSessionToken(event)

    if (token) {
        // 删除服务端session
        await deleteSession(token)
    }

    // 清除cookie
    clearSessionCookie(event)

    return { success: true, message: 'Logged out successfully' }
})