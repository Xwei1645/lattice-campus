import { requireSuperAdmin } from '../../utils/auth'
import { getSetting } from '../../utils/settings'

export default defineEventHandler(async (event) => {
    await requireSuperAdmin(event)
    
    const backupInterval = await getSetting('backupInterval', 12) // 默认 12 小时
    const backupMaxKeep = await getSetting('backupMaxKeep', 10) // 默认 10 个
    const autoBackupEnabled = await getSetting('autoBackupEnabled', true)

    return {
        backupInterval,
        backupMaxKeep,
        autoBackupEnabled
    }
})
