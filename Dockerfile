# 构建阶段
FROM node:24-slim AS builder

WORKDIR /app

# 启用 corepack 并锁定 pnpm
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

# 安装 Prisma 依赖的 OpenSSL
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# 复制配置文件和 schema
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

# 安装依赖
RUN pnpm install --frozen-lockfile

# 生成 Prisma Client
RUN pnpm prisma generate

# 复制源码
COPY . .

# 执行构建
RUN pnpm build

# 运行阶段
FROM node:24-slim AS runner

WORKDIR /app

# 安装运行时必需库
RUN apt-get update && apt-get install -y libssl3 && rm -rf /var/lib/apt/lists/*

# 环境变量配置
ENV NODE_ENV=production
ENV PORT=3000

# 复制产物并设置权限
COPY --from=builder --chown=node:node /app/.output ./.output
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --from=builder --chown=node:node /app/package.json ./package.json

USER node

EXPOSE 3000

# 执行数据库迁移并启动
CMD npx prisma migrate deploy && node .output/server/index.mjs
