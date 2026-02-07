import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
import dayjs from 'dayjs'

const execPromise = promisify(exec)
const BACKUP_DIR = path.join(process.cwd(), 'backups')

// 确保备份目录存在
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true })
}

export interface BackupFile {
    name: string
    size: number
    createTime: string
}

/**
 * 获取备份列表
 */
export async function getBackupList(): Promise<BackupFile[]> {
    if (!fs.existsSync(BACKUP_DIR)) return []
    
    const files = await fs.promises.readdir(BACKUP_DIR)
    const backupFiles = await Promise.all(
        files
            .filter(f => f.endsWith('.sql') || f.endsWith('.dump'))
            .map(async f => {
                const stats = await fs.promises.stat(path.join(BACKUP_DIR, f))
                return {
                    name: f,
                    size: stats.size,
                    createTime: dayjs(stats.birthtime).format('YYYY-MM-DD HH:mm:ss')
                }
            })
    )
    
    return backupFiles.sort((a, b) => b.createTime.localeCompare(a.createTime))
}

/**
 * 创建备份
 */
export async function createBackup() {
    const timestamp = dayjs().format('YYYYMMDD_HHmmss')
    const fileName = `backup_${timestamp}.sql`
    const filePath = path.join(BACKUP_DIR, fileName)

    // 从环境变量中解析 DB URL 或直接使用环境变量
    // DATABASE_URL=postgresql://user:password@host:port/db
    const dbUrl = process.env.DATABASE_URL
    if (!dbUrl) throw new Error('DATABASE_URL is not defined')

    // 使用 pg_dump 进行备份
    // 为了简化，我们直接使用 pg_dump --dbname=url
    try {
        await execPromise(`pg_dump "${dbUrl}" > "${filePath}"`)
        return { name: fileName, path: filePath }
    } catch (error) {
        console.error('Backup failed:', error)
        throw error
    }
}

/**
 * 还原备份
 */
export async function restoreBackup(fileName: string) {
    const filePath = path.join(BACKUP_DIR, fileName)
    if (!fs.existsSync(filePath)) {
        throw new Error('Backup file not found')
    }

    const dbUrl = process.env.DATABASE_URL
    if (!dbUrl) throw new Error('DATABASE_URL is not defined')

    try {
        // 在还原之前，可能需要终止其他连接，或者直接还原
        // 对于简单应用，直接 psql 还原
        // 注意：这会合并数据，如果想要完全覆盖，可能需要先 drop schema
        // 为了安全起见，这里只是简单的 psql 执行
        await execPromise(`psql "${dbUrl}" < "${filePath}"`)
        return true
    } catch (error) {
        console.error('Restore failed:', error)
        throw error
    }
}

/**
 * 删除备份
 */
export async function deleteBackup(fileName: string) {
    const filePath = path.join(BACKUP_DIR, fileName)
    if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath)
        return true
    }
    return false
}
