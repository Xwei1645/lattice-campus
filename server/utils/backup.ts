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
 * 清理数据库连接 URL，移除 pg_dump/psql 不支持的参数
 * Prisma 特有参数如 schema、pgbouncer 等需要移除
 */
function cleanDatabaseUrl(dbUrl: string): string {
    try {
        const url = new URL(dbUrl)
        // 获取所有支持的参数
        const supportedParams = [
            'host', 'port', 'user', 'password', 'dbname',
            'sslmode', 'sslcert', 'sslkey', 'sslrootcert',
            'connect_timeout', 'client_encoding'
        ]
        
        // 构建新的连接字符串
        const params = new URLSearchParams()
        url.searchParams.forEach((value, key) => {
            if (supportedParams.includes(key.toLowerCase())) {
                params.set(key, value)
            }
        })
        
        // 重新构建 URL
        const cleanUrl = new URL(dbUrl)
        cleanUrl.search = params.toString()
        
        return cleanUrl.toString()
    } catch {
        // 如果解析失败，返回原始 URL
        return dbUrl
    }
}

/**
 * 获取 PostgreSQL 工具的完整路径
 * 支持通过环境变量 PG_BIN_PATH 配置
 * Windows 下自动检测常见安装路径
 */
function getPgToolPath(tool: string): string {
    const pgBinPath = process.env.PG_BIN_PATH
    const ext = process.platform === 'win32' ? '.exe' : ''
    const toolName = `${tool}${ext}`
    
    // 如果配置了 PG_BIN_PATH，直接使用
    if (pgBinPath) {
        return path.join(pgBinPath, toolName)
    }
    
    // Windows 下自动检测 PostgreSQL 安装路径
    if (process.platform === 'win32') {
        const possiblePaths = [
            // Program Files 下的常见版本
            'C:\\Program Files\\PostgreSQL\\17\\bin',
            'C:\\Program Files\\PostgreSQL\\16\\bin',
            'C:\\Program Files\\PostgreSQL\\15\\bin',
            'C:\\Program Files\\PostgreSQL\\14\\bin',
            'C:\\Program Files\\PostgreSQL\\13\\bin',
            // Program Files (x86) 下的常见版本
            'C:\\Program Files (x86)\\PostgreSQL\\17\\bin',
            'C:\\Program Files (x86)\\PostgreSQL\\16\\bin',
            'C:\\Program Files (x86)\\PostgreSQL\\15\\bin',
        ]
        
        for (const binPath of possiblePaths) {
            const toolPath = path.join(binPath, toolName)
            if (fs.existsSync(toolPath)) {
                return toolPath
            }
        }
    }
    
    // 返回工具名，依赖系统 PATH
    return tool
}

/**
 * 使用 spawn 安全执行命令
 * 避免命令注入风险
 */
function executeCommand(
    command: string, 
    args: string[], 
    options: { cwd?: string } = {}
): Promise<void> {
    return new Promise((resolve, reject) => {
        // Windows 下使用 cmd.exe 执行，确保能找到命令
        const useCmd = process.platform === 'win32'
        const actualCommand = useCmd ? process.env.ComSpec || 'cmd.exe' : command
        const actualArgs = useCmd 
            ? ['/c', command, ...args] 
            : args
        
        const proc = spawn(actualCommand, actualArgs, {
            env: { ...process.env },
            stdio: ['ignore', 'pipe', 'pipe'],
            cwd: options.cwd,
            windowsHide: true
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

    // 清理连接字符串，移除不支持的参数
    const cleanDbUrl = cleanDatabaseUrl(dbUrl)

    try {
        // 使用 spawn 安全执行 pg_dump
        // 参数化方式避免命令注入
        const pgDumpPath = getPgToolPath('pg_dump')
        await executeCommand(pgDumpPath, [
            '--dbname', cleanDbUrl,
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

    // 清理连接字符串，移除不支持的参数
    const cleanDbUrl = cleanDatabaseUrl(dbUrl)

    try {
        // 使用 spawn 安全执行 psql
        // 参数化方式避免命令注入
        const psqlPath = getPgToolPath('psql')
        await executeCommand(psqlPath, [
            '--dbname', cleanDbUrl,
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
