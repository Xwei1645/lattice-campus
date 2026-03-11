import { getSessionToken, deleteSession, clearSessionCookie, getAuthUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    const user = await getAuthUser(event)
    const token = getSessionToken(event)

    if (token) {
        await deleteSession(token)
    }

    clearSessionCookie(event)

    return { success: true, message: 'Logged out successfully' }
})