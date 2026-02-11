import { requireSuperAdmin } from '../../utils/auth'
import { restoreBackup } from '../../utils/backup'
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

    try {
        await restoreBackup(fileName)

        await logSensitiveAction(event, 'backup_restore', currentUser, undefined, 'backup', {
            fileName
        })

        return {
            success: true,
            message: 'Database restored successfully'
        }
    } catch (error: any) {
        throw createError({
            statusCode: 500,
            statusMessage: error.message || 'Failed to restore backup'
        })
    }
})
