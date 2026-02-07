import 'dotenv/config'
import { defineConfig } from '@prisma/config'

const url = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/wzhs_booking'

export default defineConfig({
  datasource: {
    url
  }
})
