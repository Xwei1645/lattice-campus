import { db } from './prisma'

export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
    try {
        const setting = await db.systemSetting.findUnique({
            where: { key }
        })
        if (!setting) return defaultValue
        
        // 尝试解析 JSON
        try {
            return JSON.parse(setting.value) as T
        } catch {
            return setting.value as unknown as T
        }
    } catch (error) {
        console.error(`Failed to get setting ${key}:`, error)
        return defaultValue
    }
}

export async function setSetting(key: string, value: any): Promise<void> {
    const valueStr = typeof value === 'string' ? value : JSON.stringify(value)
    await db.systemSetting.upsert({
        where: { key },
        update: { value: valueStr },
        create: { key, value: valueStr }
    })
}
