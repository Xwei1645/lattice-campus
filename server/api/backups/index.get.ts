import { requireSuperAdmin } from '../../utils/auth'
import { getBackupList } from '../../utils/backup'
import { sendSuccess, handleError } from '../../utils/api'

export default defineEventHandler(async (event) => {
    try {
        await requireSuperAdmin(event)
        const backups = await getBackupList()
        return sendSuccess(event, backups, '获取备份列表成功')
    } catch (error) {
        return handleError(error)
    }
})
