<div align="center">

# WZHS Booking

一个基于 Nuxt 4 的校园场地预约管理系统。

</div>

> 其实就是把钉钉和希沃黏在一起的胶水（（

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/WZHS-Dev-Team/wzhs-booking.git
cd wzhs-booking
```

### 2. 配置环境变量 (参见[环境变量说明](#环境变量说明))

```bash
cp .env.example .env
```

修改 `.env` 中的数据库密码等配置。

### 3. 启动服务

- **Docker（推荐）**

  ```bash
  docker compose up -d
  ```

- **手动部署**

  需要 Node.js、pnpm、PostgreSQL。

  创建 PostgreSQL 数据库：

  ```bash
  sudo -u postgres psql -c "CREATE DATABASE wzhs_booking;"
  sudo -u postgres psql -c "CREATE USER dbuser WITH PASSWORD 'yourpassword';"
  sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE wzhs_booking TO dbuser;"
  ```

  安装依赖：

  ```bash
  pnpm install
  ```

  生成 Prisma Client：

  ```bash
  npx prisma generate --config prisma.config.ts
  ```

  执行数据库迁移：

  ```bash
  npx prisma migrate deploy --config prisma.config.ts
  ```

  构建项目：

  ```bash
  pnpm build
  ```

  启动服务：

  ```bash
  pnpm start
  ```

## 技术栈

- [Nuxt 4](https://nuxt.com/)
- [Vue 3](https://vuejs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [PostgreSQL](https://www.postgresql.org/)
- [Prisma](https://www.prisma.io/)
- [TDesign Vue Next](https://tdesign.tencent.com/vue-next/overview/)

## 环境变量说明

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | PostgreSQL 连接串 |
| `LOG_LEVEL` | 日志级别（默认开发环境 `debug`，生产环境 `info`） |
| `DINGTALK_CLIENT_ID` | 钉钉应用 ID（可选） |
| `DINGTALK_CLIENT_SECRET` | 钉钉应用密钥（可选） |

### 日志说明

- 服务端日志已使用 `pino` 输出结构化 JSON 日志。
- 普通日志：记录请求路径、状态码、耗时、IP、UA、错误信息等运行态数据。
- 审计日志：记录写操作（非 GET/HEAD/OPTIONS）的行为主体、动作、资源类型、结果、来源信息。
- 审计详情：在关键管理接口（如用户管理、预约状态变更）额外记录变更前后快照。

## 贡献者

<a href="https://github.com/WZHS-Dev-Team/wzhs-booking/graphs/contributors">
  <img src="https://contributors-img.web.app/image?repo=WZHS-Dev-Team/wzhs-booking" alt="贡献者" width="100%"/>
</a>

部分设计素材由 [Douxiba](https://github.com/Douxiba/) 提供。

## 问题反馈

如有问题或建议，请在 [Issues](https://github.com/WZHS-Dev-Team/wzhs-booking/issues) 中反馈。

## 许可证

本项目基于 [AGPLv3](LICENSE) 许可证开放源代码。

