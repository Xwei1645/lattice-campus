import { defineConfig } from '@prisma/config'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set. Please configure it in your .env file.')
}

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL
  }
})
