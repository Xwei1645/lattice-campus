import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import dayjs from 'dayjs'

const BACKUP_DIR = path.resolve(process.cwd(), 'backups')

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
 * 验证文件名是否安全
 * 防止路径遍历攻击
 */
function isValidFileName(fileName: string): boolean {
    // 只允许字母、数字、下划线、连字符和点号
    // 格式: backup_YYYYMMDD_HHmmss.sql 或 .dump
    const validPattern = 
        /^[a-zA-Z0-9_-]+\.(sql|dump)$/
    return validPattern.test(fileName)
}

/**
 * 获取安全的文件路径
 * 确保解析后的路径仍在备份目录内
 */
function getSafeFilePath(fileName: string): string {
    // 验证文件名格式
    if (!isValidFileName(fileName)) {
        throw new Error('无效的文件名格式')
    }

    // 解析绝对路径
    const resolvedPath = path.resolve(BACKUP_DIR, fileName)
    
    // 确保路径在备份目录内
    if (!resolvedPath.startsWith(BACKUP_DIR + path.sep) && 
        resolvedPath !== BACKUP_DIR) {
        throw new Error('非法的文件路径')
    }

    return resolvedPath
}

/**
 * 使用 spawn 安全执行命令
 * 避免命令注入风险
 */
function executeCommand(
    command: string, 
    args: string[], 
    env: NodeJS.ProcessEnv = {}
): Promise<void> {
    return new Promise((resolve, reject) => {
        const proc = spawn(command, args, {
            env: { ...process.env, ...env },
            stdio: ['ignore', 'pipe', 'pipe']
        })

        let stderr = ''
        
        proc.stderr.on('data', (data) => {
            stderr += data.toString()
        })

        proc.on('error', (err) => {
            reject(new Error(`命令执行失败: ${err.message}`))
        })

        proc.on('close', (code) => {
            if (code === 0) {
                resolve()
            } else {
                reject(new Error(`命令执行失败，退出码: ${code}, ${stderr}`))
            }
        })
    })
}

/**
 * 获取备份列表
 */
export async function getBackupList(): Promise<BackupFile[]> {
    if (!fs.existsSync(BACKUP_DIR)) return []
    
    const files = await fs.promises.readdir(BACKUP_DIR)
    const backupFiles = await Promise.all(
        files
            .filter(f => isValidFileName(f))
            .map(async f => {
                const filePath = getSafeFilePath(f)
                const stats = await fs.promises.stat(filePath)
                return {
                    name: f,
                    size: stats.size,
                    createTime: dayjs(stats.birthtime)
                        .format('YYYY-MM-DD HH:mm:ss')
                }
            })
    )
    
    return backupFiles.sort((a, b) => 
        b.createTime.localeCompare(a.createTime)
    )
}

/**
 * 创建备份
 */
export async function createBackup() {
    const timestamp = dayjs().format('YYYYMMDD_HHmmss')
    const fileName = `backup_${timestamp}.sql`
    const filePath = getSafeFilePath(fileName)

    // 从环境变量中获取数据库连接信息
    const dbUrl = process.env.DATABASE_URL
    if (!dbUrl) {
        throw new Error('DATABASE_URL 未配置')
    }

    try {
        // 使用 spawn 安全执行 pg_dump
        // 参数化方式避免命令注入
        await executeCommand('pg_dump', [
            '--dbname', dbUrl,
            '--file', filePath
        ])
        
        return { name: fileName, path: filePath }
    } catch (error: any) {
        console.error('备份失败:', error.message)
        throw new Error('数据库备份失败')
    }
}

/**
 * 还原备份
 */
export async function restoreBackup(fileName: string) {
    // 验证并获取安全路径
    const filePath = getSafeFilePath(fileName)
    
    if (!fs.existsSync(filePath)) {
        throw new Error('备份文件不存在')
    }

    const dbUrl = process.env.DATABASE_URL
    if (!dbUrl) {
        throw new Error('DATABASE_URL 未配置')
    }

    try {
        // 使用 spawn 安全执行 psql
        // 参数化方式避免命令注入
        await executeCommand('psql', [
            '--dbname', dbUrl,
            '--file', filePath
        ])
        
        return true
    } catch (error: any) {
        console.error('还原失败:', error.message)
        throw new Error('数据库还原失败')
    }
}

/**
 * 删除备份
 */
export async function deleteBackup(fileName: string) {
    const filePath = getSafeFilePath(fileName)
    
    if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath)
        return true
    }
    return false
}

/**
 * 重命名备份
 */
export async function renameBackup(oldName: string, newName: string) {
    // 验证新文件名格式
    if (!isValidFileName(newName)) {
        throw new Error('文件名格式无效，只允许字母、数字、下划线、连字符')
    }

    const oldPath = getSafeFilePath(oldName)
    const newPath = getSafeFilePath(newName)

    if (oldName === newName) {
        return true
    }

    if (!fs.existsSync(oldPath)) {
        throw new Error('原备份文件不存在')
    }

    if (fs.existsSync(newPath)) {
        throw new Error('目标文件名已存在')
    }

    await fs.promises.rename(oldPath, newPath)
    return true
}
