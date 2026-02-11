import { requireSuperAdmin } from '../../utils/auth'
import { createBackup } from '../../utils/backup'
import { logSensitiveAction } from '../../utils/audit'

export default defineEventHandler(async (event) => {
    const currentUser = await requireSuperAdmin(event)
    try {
        const result = await createBackup()

        await logSensitiveAction(event, 'backup_create', currentUser, undefined, 'backup', {
            fileName: result.fileName,
            size: result.size
        })

        return {
            success: true,
            message: 'Backup created successfully',
            data: result
        }
    } catch (error: any) {
        throw createError({
            statusCode: 500,
            statusMessage: error.message || 'Failed to create backup'
        })
    }
})
