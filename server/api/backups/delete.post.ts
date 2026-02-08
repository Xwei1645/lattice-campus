import { requireSuperAdmin } from '../../utils/auth'
import { deleteBackup } from '../../utils/backup'

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

    const success = await deleteBackup(fileName)
    if (!success) {
        throw createError({
            statusCode: 404,
            statusMessage: 'Backup file not found'
        })
    }

    return {
        success: true,
        message: 'Backup deleted successfully'
    }
})
