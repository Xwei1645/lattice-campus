import { createBackup, getBackupList, deleteBackup } from '../utils/backup'
import { getSetting } from '../utils/settings'

export default defineNitroPlugin((nitroApp) => {
    const runAutoBackup = async () => {
        try {
            // 从数据库读取最新配置
            const enabled = await getSetting('autoBackupEnabled', true)
            const maxBackups = await getSetting('backupMaxKeep', 10)
            const intervalHours = await getSetting('backupInterval', 12)

            if (enabled) {
                console.log('[Auto-Backup] Starting scheduled backup...')
                await createBackup()
                
                // 清理旧备份
                const backups = await getBackupList()
                if (backups.length > maxBackups) {
                    const toDelete = backups.slice(maxBackups)
                    for (const b of toDelete) {
                        await deleteBackup(b.name)
                        console.log(`[Auto-Backup] Deleted old backup: ${b.name}`)
                    }
                }
                console.log('[Auto-Backup] Finished scheduled backup.')
            }

            // 调度下一次运行
            setTimeout(runAutoBackup, intervalHours * 60 * 60 * 1000)
        } catch (error) {
            console.error('[Auto-Backup] Failed:', error)
            // 出错也调度下一次运行（默认12小时后）
            setTimeout(runAutoBackup, 12 * 60 * 60 * 1000)
        }
    }

    if (process.env.NODE_ENV === 'production') {
        // 初始运行：延迟 1 分钟启动，避免启动瞬间压力
        setTimeout(runAutoBackup, 60 * 1000)
        console.log('[Auto-Backup] Service initialized.')
    }
})
