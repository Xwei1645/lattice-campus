import { db } from '../utils/prisma'
import bcrypt from 'bcryptjs'
import { appLogger } from '../utils/logger'

export default defineNitroPlugin(async (nitroApp) => {
    try {
        const userCount = await db.user.count()

        if (userCount === 0) {
            appLogger.warn({
                category: 'system.init'
            }, 'No users found. Creating default super admin...')

            const hashedPassword = await bcrypt.hash('admin123456', 10)

            await db.user.create({
                data: {
                    account: 'system',
                    password: hashedPassword,
                    name: '超级管理员',
                    role: 'super_admin',
                    status: true
                }
            })

            appLogger.warn({
                category: 'system.init',
                account: 'system'
            }, 'Default super admin created')
        }
    } catch (error) {
        appLogger.error({
            category: 'system.init',
            error: error instanceof Error ? error.message : 'Unknown initialization error'
        }, 'Failed to initialize database')
    }
})
