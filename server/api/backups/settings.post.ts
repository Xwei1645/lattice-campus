import { requireSuperAdmin } from '../../utils/auth'
import { setSetting } from '../../utils/settings'

export default defineEventHandler(async (event) => {
    await requireSuperAdmin(event)
    const body = await readBody(event)
    
    if (body.backupInterval !== undefined) {
        await setSetting('backupInterval', Number(body.backupInterval))
    }
    if (body.backupMaxKeep !== undefined) {
        await setSetting('backupMaxKeep', Number(body.backupMaxKeep))
    }
    if (body.autoBackupEnabled !== undefined) {
        await setSetting('autoBackupEnabled', Boolean(body.autoBackupEnabled))
    }

    return { success: true }
})
