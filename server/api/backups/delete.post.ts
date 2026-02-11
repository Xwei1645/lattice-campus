import { requireSuperAdmin } from '../../utils/auth'
import { deleteBackup } from '../../utils/backup'
import { logSensitiveAction } from '../../utils/audit'

export default defineEventHandler(async (event) => {
    const currentUser = await requireSuperAdmin(event)
    const body = await readBody(event)
    const { fileName } = body

    if (!fileName) {
        throw createError({
            statusCode: 400,
            statusMessage: 'fileName is required'
        })
    }

    const success = await deleteBackup(fileName)
    if (!success) {
        throw createError({
            statusCode: 404,
            statusMessage: 'Backup file not found'
        })
    }

    await logSensitiveAction(event, 'backup_delete', currentUser, undefined, 'backup', {
        fileName
    })

    return {
        success: true,
        message: 'Backup deleted successfully'
    }
})
