import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

let prisma: PrismaClient

if (process.env.NODE_ENV === 'production') {
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
    const adapter = new PrismaPg(pool)
    prisma = new PrismaClient({ adapter })
} else {
    const g = globalThis as any
    if (!g.prisma) {
        const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
        const adapter = new PrismaPg(pool)
        g.prisma = new PrismaClient({ adapter })
    }
    prisma = g.prisma
}

export const db = prisma
export default db
