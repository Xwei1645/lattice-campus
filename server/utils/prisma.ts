import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import type { PrismaClient as PrismaClientType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

function createPrismaClient() {
    const databaseUrl = process.env.DATABASE_URL
    
    if (!databaseUrl) {
        console.warn('Prisma: DATABASE_URL environment variable is not set. Using dummy connection for build/init.')
    }
    
    const pool = new pg.Pool({ connectionString: databaseUrl || 'postgresql://null:5433/null' })
    const adapter = new PrismaPg(pool)
    return new PrismaClient({ adapter })
}

let prisma: PrismaClientType

if (process.env.NODE_ENV === 'production') {
    prisma = createPrismaClient()
} else {
    const g = globalThis as any
    if (!g.prisma) {
        g.prisma = createPrismaClient()
    }
    prisma = g.prisma
}

export const db = prisma
export default db
