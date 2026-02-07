# ==================================================
# Stage 1: Base — 安装 pnpm
# ==================================================
FROM node:22-alpine AS base

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

# ==================================================
# Stage 2: Dependencies — 安装全部依赖
# ==================================================
FROM base AS deps

# pnpm-workspace.yaml 包含 onlyBuiltDependencies 配置，必须一起复制
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma/

RUN pnpm install --frozen-lockfile

# ==================================================
# Stage 3: Build — 构建应用
# ==================================================
FROM deps AS build

ARG GIT_HASH=unknown
ENV GIT_HASH=$GIT_HASH

COPY . .

# 生成 Prisma Client（仅需 schema，不需要真实数据库连接）
RUN pnpm prisma generate --config prisma.config.ts

# 构建 Nuxt 应用
RUN pnpm build

# ==================================================
# Stage 4: Runner — 最终生产镜像
# ==================================================
FROM node:22-alpine AS runner

WORKDIR /app

# Prisma 运行时需要 OpenSSL, 备份功能需要 postgresql-client
RUN apk add --no-cache openssl postgresql16-client

ENV NODE_ENV=production
ENV PORT=3000

# 复制 Nuxt 构建产物（自包含的 Node.js 服务端）
COPY --from=build --chown=node:node /app/.output ./.output

# 复制 node_modules（运行时 prisma migrate 需要 prisma CLI、@prisma/config、dotenv 等）
COPY --from=build --chown=node:node /app/node_modules ./node_modules

# 复制 Prisma 相关文件（schema、migrations、config）
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/package.json /app/prisma.config.ts ./

# 复制启动脚本
COPY --chown=node:node docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

USER node

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
