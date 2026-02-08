import { requireSuperAdmin } from '../../utils/auth'
import { renameBackup } from '../../utils/backup'

export default defineEventHandler(async (event) => {
    await requireSuperAdmin(event)
    const body = await readBody(event)
    const { oldName, newName } = body

    if (!oldName || !newName) {
        throw createError({
            statusCode: 400,
            statusMessage: 'oldName and newName are required'
        })
    }

    try {
        await renameBackup(oldName, newName)
        return {
            success: true,
            message: 'Backup renamed successfully'
        }
    } catch (error: any) {
        throw createError({
            statusCode: 400,
            statusMessage: error.message || 'Failed to rename backup'
        })
    }
})
