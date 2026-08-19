#!/bin/bash
set -e

echo "================================================"
echo "  OpenMAIC Docker 一键部署脚本"
echo "================================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. 检查前置条件
echo "🔍 检查系统环境..."

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ 未检测到 Docker${NC}"
    echo "请先安装: curl -fsSL https://get.docker.com | sh"
    exit 1
fi

if ! docker compose version &> /dev/null 2>&1 && ! docker-compose version &> /dev/null 2>&1; then
    echo -e "${RED}❌ 未检测到 Docker Compose${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker 环境就绪${NC}"
echo ""

# 2. 确定部署目录
DEPLOY_DIR="${DEPLOY_DIR:-/opt/openmaic}"
if [ -d "$(pwd)/OpenMAIC-main" ]; then
    # 如果在项目目录下运行，使用当前目录
    DEPLOY_DIR="$(pwd)"
fi
echo "📁 部署目录: $DEPLOY_DIR"
echo ""

# 3. 检查项目文件
if [ ! -f "$DEPLOY_DIR/docker-compose.yml" ]; then
    echo -e "${YELLOW}⚠️  未找到 docker-compose.yml${NC}"
    echo "请确保在 OpenMAIC 项目目录下运行此脚本"
    echo "当前目录: $(pwd)"
    exit 1
fi

# 4. 生成环境变量
if [ ! -f "$DEPLOY_DIR/.env.local" ]; then
    echo "📝 生成环境变量文件..."

    # 生成随机密钥
    AUTH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 2>/dev/null || openssl rand -hex 32)
    DB_PASSWORD=$(node -e "console.log(require('crypto').randomBytes(16).toString('hex'))" 2>/dev/null || openssl rand -hex 16)
    PERSISTENCE_TOKEN=$(node -e "console.log(require('crypto').randomBytes(16).toString('hex'))" 2>/dev/null || openssl rand -hex 16)

    cat > "$DEPLOY_DIR/.env.local" << EOF
# =============================================================================
# OpenMAIC Production Environment
# Generated: $(date '+%Y-%m-%d %H:%M:%S')
# =============================================================================

# --- Authentication -----------------------------------------------------------
AUTH_SECRET=${AUTH_SECRET}
AUTH_COOKIE_NAME=maic_session

# --- GitHub OAuth (可选) -----------------------------------------------------
# 配置后用户可使用 GitHub 账号登录
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# --- Database ----------------------------------------------------------------
DATABASE_URL=postgres://openmaic:${DB_PASSWORD}@postgres:5432/openmaic
PERSISTENCE_POSTGRES_PASSWORD=${DB_PASSWORD}

# --- Persistence --------------------------------------------------------------
PERSISTENCE_DEV_TOKEN=${PERSISTENCE_TOKEN}
NEXT_PUBLIC_PERSISTENCE_TOKEN=${PERSISTENCE_TOKEN}

# --- LLM Providers (按需配置) -------------------------------------------------
# OPENAI_API_KEY=
# ANTHROPIC_API_KEY=
# AGNES_AI_API_KEY=
# AGNES_AI_BASE_URL=https://apihub.agnes-ai.com/v1
# AGNES_AI_MODELS=agnes-2.5-flash,agnes-2.5-pro

# --- Video Export (可选) ------------------------------------------------------
# RENDER_SERVICE_URL=http://render-service:9000
EOF

    echo -e "${GREEN}✅ 环境变量文件已创建: .env.local${NC}"
    echo ""
    echo "⚠️  重要：请编辑 .env.local 文件配置以下内容："
    echo "   1. AUTH_GITHUB_ID / AUTH_GITHUB_SECRET (GitHub OAuth)"
    echo "   2. NEXT_PUBLIC_BASE_URL (您的域名)"
    echo "   3. LLM API Keys (如需要)"
    echo ""
fi

# 5. 询问是否需要启动视频渲染服务
echo "🎬 是否启动视频导出渲染服务？"
echo "   此服务需要约 8GB 内存，如果您不需要视频导出功能可以跳过"
read -p "启动渲染服务? (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    PROFILE="--profile video-export"
    echo -e "${GREEN}✅ 将包含渲染服务${NC}"
else
    PROFILE=""
    echo -e "${YELLOW}ℹ️  跳过渲染服务（节省资源）${NC}"
fi
echo ""

# 6. 构建并启动
echo "🚀 开始构建并启动服务..."
echo ""

cd "$DEPLOY_DIR"

# 拉取最新镜像
echo "📥 拉取 Docker 镜像..."
docker compose pull || true

# 构建并启动
echo "🔨 构建 Docker 镜像（首次构建可能需要 10-20 分钟）..."
docker compose up -d --build $PROFILE

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  部署完成！${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "📍 访问地址: http://服务器IP:3000"
echo ""
echo "📋 常用命令:"
echo "  cd $DEPLOY_DIR"
echo "  docker compose logs -f          # 查看日志"
echo "  docker compose down             # 停止服务"
echo "  docker compose restart          # 重启服务"
echo "  docker compose ps               # 查看状态"
echo ""
echo "🗄️  数据库管理:"
echo "  docker exec -it \$(docker compose ps -q postgres) psql -U openmaic -d openmaic"
echo ""
echo "🔧 迁移数据库:"
echo "  docker exec -i \$(docker compose ps -q postgres) psql -U openmaic -d openmaic < migrations/001_create_users_table.sql"
echo ""
echo "⚙️  配置 LLM API:"
echo "  nano .env.local  # 添加您的 API Keys"
echo "  docker compose restart openmaic"
echo ""
echo -e "${YELLOW}注意: 请记得编辑 .env.local 配置 GitHub OAuth 和 LLM API Keys${NC}"
echo ""
