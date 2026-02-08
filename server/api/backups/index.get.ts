import { requireSuperAdmin } from '../../utils/auth'
import { getBackupList } from '../../utils/backup'

export default defineEventHandler(async (event) => {
    await requireSuperAdmin(event)
    return await getBackupList()
})
