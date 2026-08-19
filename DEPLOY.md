# OpenMAIC 服务器部署指南

## 一、服务器要求

- **操作系统**: Ubuntu 20.04+ / Debian 11+ / CentOS 8+
- **内存**: 最低 4GB，推荐 8GB+
- **磁盘**: 最少 20GB 可用空间
- **Docker**: 24.0+
- **Docker Compose**: 2.20+

## 二、一键部署脚本

将以下脚本保存为 `deploy.sh`，上传到服务器后执行：

```bash
#!/bin/bash
set -e

echo "=== OpenMAIC Docker 部署脚本 ==="
echo ""

# 1. 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "❌ 未检测到 Docker，请先安装:"
    echo "   curl -fsSL https://get.docker.com | sh"
    exit 1
fi

if ! command -v docker compose &> /dev/null; then
    echo "❌ 未检测到 Docker Compose，请先安装:"
    echo "   curl -L 'https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)' -o /usr/local/bin/docker-compose && chmod +x /usr/local/bin/docker-compose"
    exit 1
fi

echo "✅ Docker 和 Docker Compose 已就绪"
echo ""

# 2. 准备目录
DEPLOY_DIR="/opt/openmaic"
echo "📁 部署目录: $DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"
cd "$DEPLOY_DIR"

# 3. 创建环境变量文件（如果不存在）
if [ ! -f ".env" ]; then
    echo "📝 生成环境变量文件..."
    AUTH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 2>/dev/null || echo "CHANGE_ME_AUTH_SECRET")
    DB_PASSWORD=$(node -e "console.log(require('crypto').randomBytes(16).toString('hex'))" 2>/dev/null || echo "CHANGE_ME_DB_PASSWORD")
    PERSISTENCE_TOKEN=$(node -e "console.log(require('crypto').randomBytes(16).toString('hex'))" 2>/dev/null || echo "CHANGE_ME_PERSISTENCE_TOKEN")

    cat > .env << EOF
# Authentication
AUTH_SECRET=${AUTH_SECRET}
AUTH_COOKIE_NAME=maic_session

# GitHub OAuth (可选)
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Database
DATABASE_URL=postgres://openmaic:${DB_PASSWORD}@postgres:5432/openmaic
PERSISTENCE_DEV_TOKEN=${PERSISTENCE_TOKEN}
NEXT_PUBLIC_PERSISTENCE_TOKEN=${PERSISTENCE_TOKEN}
PERSISTENCE_POSTGRES_PASSWORD=${DB_PASSWORD}

# LLM Providers (按需配置)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
AGNES_AI_API_KEY=
EOF
    echo "✅ 环境变量文件已创建: .env"
else
    echo "✅ 检测到已有的 .env 文件，跳过创建"
fi

# 4. 复制项目文件
echo ""
echo "📦 复制项目文件..."
cp -r /path/to/OpenMAIC-main/* . 2>/dev/null || echo "⚠️ 请手动复制项目文件到 $DEPLOY_DIR"

# 5. 构建并启动
echo ""
echo "🚀 开始构建 Docker 镜像（首次构建需要 10-20 分钟）..."
docker compose up -d --build

echo ""
echo "=== 部署完成 ==="
echo ""
echo "访问地址: http://你的服务器IP:3000"
echo ""
echo "管理数据库:"
echo "  docker exec -it $(docker compose -f $DEPLOY_DIR/docker-compose.yml ps -q postgres) psql -U openmaic -d openmaic"
echo ""
echo "查看日志:"
echo "  docker compose -f $DEPLOY_DIR/docker-compose.yml logs -f"
echo ""
echo "管理命令:"
echo "  cd $DEPLOY_DIR && docker compose down          # 停止服务"
echo "  cd $DEPLOY_DIR && docker compose restart       # 重启服务"
echo "  cd $DEPLOY_DIR && docker compose pull && docker compose up -d  # 更新"
```

## 三、手动部署步骤

### 步骤 1：克隆代码

```bash
git clone https://github.com/juekefanson/OpenMAIC.git
cd OpenMAIC
```

### 步骤 2：配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env.local

# 编辑配置
nano .env.local
```

关键配置项：

```env
# 必须配置
AUTH_SECRET=<随机生成的32位密钥>
DATABASE_URL=postgres://openmaic:YOUR_PASSWORD@postgres:5432/openmaic

# GitHub OAuth（可选）
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
NEXT_PUBLIC_BASE_URL=https://your-domain.com

# Persistence Token
PERSISTENCE_DEV_TOKEN=<随机生成的token>
NEXT_PUBLIC_PERSISTENCE_TOKEN=<同上>

# LLM API Keys（按需）
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
AGNES_AI_API_KEY=
```

### 步骤 3：运行数据库迁移

```bash
# 启动 postgres（仅用于迁移）
docker compose -f docker-compose.yml up -d postgres

# 等待数据库就绪
sleep 10

# 执行迁移
docker exec -i $(docker compose -f docker-compose.yml ps -q postgres) psql -U openmaic -d openmaic < migrations/001_create_users_table.sql

# 停止 postgres（如果只想运行 app）
docker compose -f docker-compose.yml stop postgres
```

### 步骤 4：构建并启动

```bash
# 构建并后台启动
docker compose up -d --build

# 查看日志
docker compose logs -f
```

### 步骤 5：配置反向代理（Nginx）

创建 `/etc/nginx/sites-available/openmaic`：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/openmaic /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## 四、常用管理命令

```bash
# 进入部署目录
cd /opt/openmaic

# 查看所有容器状态
docker compose ps

# 查看实时日志
docker compose logs -f

# 停止所有服务
docker compose down

# 重启服务
docker compose restart

# 更新代码并重新部署
git pull
docker compose down
docker compose up -d --build

# 清理旧镜像
docker image prune -a -f

# 备份数据库
docker exec openmaic-postgres-1 pg_dump -U openmaic openmaic > backup_$(date +%Y%m%d).sql

# 恢复数据库
cat backup.sql | docker exec -i openmaic-postgres-1 psql -U openmaic openmaic
```

## 五、配置 LLM 提供商

在 `.env.local` 中添加 API Keys：

```env
# OpenAI
OPENAI_API_KEY=sk-...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Agnes AI
AGNES_AI_API_KEY=...
AGNES_AI_BASE_URL=https://apihub.agnes-ai.com/v1
AGNES_AI_MODELS=agnes-2.5-flash,agnes-2.5-pro
```

## 六、可选组件

### 视频导出渲染服务（需要 GPU 或大内存）

```bash
# 启动完整栈（包含渲染服务）
docker compose --profile video-export up -d --build
```

### 使用外部 PostgreSQL（如 Supabase/Neon）

修改 `.env.local`：
```env
DATABASE_URL=postgres://user:password@db.supabase.co:5432/postgres
```

然后禁用 docker-compose 中的 postgres 服务：
```yaml
# docker-compose.yml 中注释掉 postgres 服务
```

## 七、安全建议

1. **使用 HTTPS**：通过 Let's Encrypt 免费证书
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

2. **定期备份**：
   ```bash
   # 添加到 crontab
   0 3 * * * docker exec openmaic-postgres-1 pg_dump -U openmaic openmaic | gzip > /backup/openmaic_$(date +\%Y\%m\%d).sql.gz
   ```

3. **限制访问**：使用防火墙只开放必要端口
   ```bash
   sudo ufw allow 3000/tcp  # 仅本地访问时使用
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```
