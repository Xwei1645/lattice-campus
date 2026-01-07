# WZHS Booking

## 快速起步

请按照以下步骤完成环境初始化。

### 1. 安装依赖
确保已安装 [pnpm](https://pnpm.io/)，然后运行：
```bash
pnpm install
```

### 2. 环境配置
将环境变量模板文件复制为 `.env` 并根据实际情况编辑：
```bash
cp .env.example .env
```

### 3. 数据库初始化
根据您的使用场景，选择以下方式之一初始化数据库：

- **生产环境**
  生成 Prisma Client 并应用现有的迁移记录：
  ```bash
  npx prisma generate
  npx prisma migrate deploy
  ```

- **开发环境**
  同步本地架构修改并生成新迁移：
  ```bash
  npx prisma migrate dev
  ```

### 4. 导入示例数据 (可选)
如果需要初始化系统默认数据或测试数据，请运行：
```bash
node seed.js
```

### 5. 启动服务

- **开发模式**:
  ```bash
  pnpm dev
  ```

- **生产部署**:
  首先执行构建：
  ```bash
  pnpm build
  ```
  然后使用 PM2 启动（推荐）：
  ```bash
  pm2 start .output/server/index.mjs --name lattice-campus
  ```
