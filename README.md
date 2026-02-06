# WZHS Booking

快速导航：
- [Docker 部署 (推荐)](#docker-部署与更新)
- [直接运行 (PM2)](#直接运行与生产部署)
- [本地开发指南](#本地开发指南)

---

## Docker 部署与更新

<details>
<summary><b>环境要求：安装 Docker & Docker Compose</b></summary>

1. **安装 Docker**:
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```
2. **设置开机自启**:
   ```bash
   sudo systemctl enable --now docker
   ```
3. **检查 Compose 插件**:
   ```bash
   docker compose version
   ```
</details>

### 1. 快速部署

确保已安装 Docker 和 Docker Compose，并在项目根目录执行：

```bash
# 复制并配置环境变量 (修改 POSTGRES_PASSWORD 等)
cp .env.example .env

# 一键启动服务 (包含数据库、应用及自动迁移)
docker compose up -d
```

### 2. 如何更新项目

当代码有变动需要更新时，执行：

```bash
# 1. 拉取最新代码
git pull

# 2. 重新构建并平滑启动
docker compose up -d --build

# 3. (可选) 清理旧镜像释放空间
docker image prune -f
```

### 3. 容器常用维护命令

- **查看实时日志**: `docker compose logs -f app`
- **重启应用容器**: `docker compose restart app`
- **执行数据填充 (Seed)**: `docker compose exec app npx prisma db seed`
- **停止并移除所有服务**: `docker compose down`

---

## 直接运行与生产部署

如果您不想使用 Docker，可以按照以下步骤手动部署。

<details>
<summary><b>环境要求：安装 Node.js, pnpm, PM2 (可选) & PostgreSQL</b></summary>

**1. Node.js & pnpm**
```bash
# 安装 Node 22 (使用 nvm)
nvm install 22
nvm use 22
# 安装 pnpm
npm install -g pnpm
```

**2. PM2**
```bash
npm install -g pm2
# 设置开机自启 (可选)
pm2 startup
# 按照输出提示执行 sudo 命令，最后执行 pm2 save
```

**3. PostgreSQL**
```bash
# 安装 PostgreSQL
sudo apt install postgresql
# 创建数据库及授权
sudo -u postgres psql -c "CREATE DATABASE wzhs_booking;"
sudo -u postgres psql -c "CREATE USER dbuser WITH PASSWORD 'yourpassword';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE wzhs_booking TO dbuser;"
```
</details>

### 1. 环境配置
```bash
cp .env.example .env
# 修改 .env 中的 DATABASE_URL
```

### 2. 数据库初始化
```bash
# 生成 Prisma Client 并应用迁移
npx prisma generate --config prisma/prisma.config.ts
npx prisma migrate deploy --config prisma/prisma.config.ts
```

### 3. 启动应用

- **传统方式**:
  ```bash
  # 构建
  pnpm build
  # 启动
  pnpm start
  ```

- **使用 PM2 启动 (推荐)**:
  ```bash
  # 首次启动
  pm2 start pnpm --name "wzhs-booking" -- start
  # 后续重启
  pm2 restart wzhs-booking
  ```

<details>
<summary><b>PM2 常用命令清单</b></summary>

- **状态查询**: `pm2 list`
- **日志查看**: `pm2 logs wzhs-booking`
- **保存列表 (开机自启)**: `pm2 save`
</details>

---

## 本地开发指南

<details>
<summary><b>环境要求：Node.js & pnpm</b></summary>

```bash
# 确保已安装 Node
node -v
# 安装依赖
pnpm install
```
</details>

### 1. 安装依赖
```bash
pnpm install
```

### 2. 开发模式运行
```bash
# 启动 Nuxt 开发服务器
pnp版本信息
<details>
<summary><b>PostgreSQL (手动部署时需要)</b></summary>

1. **安装**: `sudo apt install postgresql`
2. **创建数据库**:
   ```sql
   CREATE DATABASE wzhs_booking;
   CREATE USER dbuser WITH PASSWORD 'yourpassword';
   GRANT ALL PRIVILEGES ON DATABASE wzhs_booking TO dbuser;
   ```
</details>
