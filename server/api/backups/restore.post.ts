import { requireSuperAdmin } from '../../utils/auth'
import { restoreBackup } from '../../utils/backup'

export default defineEventHandler(async (event) => {
    await requireSuperAdmin(event)
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
