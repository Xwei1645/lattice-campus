import { requireSuperAdmin } from '../../utils/auth'
import { createBackup } from '../../utils/backup'

export default defineEventHandler(async (event) => {
    await requireSuperAdmin(event)
    try {
        const result = await createBackup()
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
