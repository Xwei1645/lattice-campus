import { getSessionToken, deleteSession, clearSessionCookie, getAuthUser } from '../../utils/auth'
import { logLogout } from '../../utils/audit'

export default defineEventHandler(async (event) => {
    const user = await getAuthUser(event)
    const token = getSessionToken(event)

    if (token) {
        await deleteSession(token)
    }

    clearSessionCookie(event)

    if (user) {
        await logLogout(event, user)
    }

    return { success: true, message: 'Logged out successfully' }
})