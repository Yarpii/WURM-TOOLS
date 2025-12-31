#!/bin/bash
#===============================================================================
# WURM-TOOLS VPS Initial Setup Script
# For Ubuntu 22.04/24.04 LTS on OVH VPS
#
# This script installs and configures:
# - System updates and essential packages
# - PostgreSQL 16
# - Node.js 20 LTS
# - PM2 Process Manager
# - Caddy Web Server (reverse proxy + auto-SSL)
#
# Usage: sudo bash 01-initial-setup.sh
#===============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="${DOMAIN:-blackforge.tools}"
DB_NAME="${DB_NAME:-wurmtools}"
DB_USER="${DB_USER:-wurmtools}"
APP_DIR="/var/www/wurm-tools"

#===============================================================================
# Helper Functions
#===============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_banner() {
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║                                                            ║"
    echo "║   ██████╗ ██╗      █████╗  ██████╗██╗  ██╗                 ║"
    echo "║   ██╔══██╗██║     ██╔══██╗██╔════╝██║ ██╔╝                 ║"
    echo "║   ██████╔╝██║     ███████║██║     █████╔╝                  ║"
    echo "║   ██╔══██╗██║     ██╔══██║██║     ██╔═██╗                  ║"
    echo "║   ██████╔╝███████╗██║  ██║╚██████╗██║  ██╗                 ║"
    echo "║   ╚═════╝ ╚══════╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝                 ║"
    echo "║                                                            ║"
    echo "║   ███████╗ ██████╗ ██████╗  ██████╗ ███████╗               ║"
    echo "║   ██╔════╝██╔═══██╗██╔══██╗██╔════╝ ██╔════╝               ║"
    echo "║   █████╗  ██║   ██║██████╔╝██║  ███╗█████╗                 ║"
    echo "║   ██╔══╝  ██║   ██║██╔══██╗██║   ██║██╔══╝                 ║"
    echo "║   ██║     ╚██████╔╝██║  ██║╚██████╔╝███████╗               ║"
    echo "║   ╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝               ║"
    echo "║                                                            ║"
    echo "║            VPS Initial Setup Script v1.0                   ║"
    echo "║                                                            ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "Please run as root (sudo bash $0)"
        exit 1
    fi
}

#===============================================================================
# System Setup
#===============================================================================

setup_system() {
    log_info "Updating system packages..."
    apt update && apt upgrade -y

    log_info "Installing essential packages..."
    apt install -y \
        curl \
        wget \
        git \
        htop \
        vim \
        nano \
        unzip \
        build-essential \
        software-properties-common \
        apt-transport-https \
        ca-certificates \
        gnupg \
        lsb-release

    log_success "System packages installed"
}

#===============================================================================
# PostgreSQL Setup
#===============================================================================

setup_postgresql() {
    log_info "Installing PostgreSQL 16..."

    # Add PostgreSQL APT repository
    sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
    wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /usr/share/keyrings/postgresql-keyring.gpg
    echo "deb [signed-by=/usr/share/keyrings/postgresql-keyring.gpg] http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list

    apt update
    apt install -y postgresql-16 postgresql-contrib-16

    # Start and enable PostgreSQL
    systemctl start postgresql
    systemctl enable postgresql

    log_success "PostgreSQL 16 installed and running"
}

setup_database() {
    log_info "Setting up database..."

    # Generate a random password
    DB_PASS=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 24)

    # Create user and database
    sudo -u postgres psql <<EOF
-- Create user
CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';

-- Create database
CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};

-- Connect and grant schema privileges
\c ${DB_NAME}
GRANT ALL ON SCHEMA public TO ${DB_USER};
EOF

    # Save credentials
    mkdir -p /root/.wurm-tools
    cat > /root/.wurm-tools/db-credentials.txt <<EOF
# WURM-TOOLS Database Credentials
# Generated: $(date)
# KEEP THIS FILE SECURE!

DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASS=${DB_PASS}
EOF
    chmod 600 /root/.wurm-tools/db-credentials.txt

    log_success "Database '${DB_NAME}' created with user '${DB_USER}'"
    log_warning "Credentials saved to /root/.wurm-tools/db-credentials.txt"
}

#===============================================================================
# Node.js Setup
#===============================================================================

setup_nodejs() {
    log_info "Installing Node.js 20 LTS..."

    # Remove any existing Node.js
    apt remove -y nodejs npm 2>/dev/null || true

    # Install Node.js 20
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs

    # Verify installation
    NODE_VERSION=$(node --version)
    NPM_VERSION=$(npm --version)

    log_success "Node.js ${NODE_VERSION} installed (npm ${NPM_VERSION})"
}

setup_pm2() {
    log_info "Installing PM2 process manager..."

    npm install -g pm2

    # Setup PM2 startup script
    pm2 startup systemd -u root --hp /root

    log_success "PM2 installed and configured for startup"
}

#===============================================================================
# Caddy Setup
#===============================================================================

setup_caddy() {
    log_info "Installing Caddy web server..."

    # Add Caddy repository
    apt install -y debian-keyring debian-archive-keyring
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list

    apt update
    apt install -y caddy

    # Create Caddyfile
    cat > /etc/caddy/Caddyfile <<EOF
# Caddy configuration for ${DOMAIN}
# Auto-SSL via Let's Encrypt

${DOMAIN}, www.${DOMAIN} {
    reverse_proxy localhost:3000

    # Security headers
    header {
        # Enable HSTS
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        # Prevent clickjacking
        X-Frame-Options "SAMEORIGIN"
        # Prevent MIME type sniffing
        X-Content-Type-Options "nosniff"
        # XSS protection
        X-XSS-Protection "1; mode=block"
        # Referrer policy
        Referrer-Policy "strict-origin-when-cross-origin"
    }

    # Logging
    log {
        output file /var/log/caddy/${DOMAIN}.log {
            roll_size 10mb
            roll_keep 5
        }
    }
}
EOF

    # Create log directory
    mkdir -p /var/log/caddy
    chown caddy:caddy /var/log/caddy

    # Don't start Caddy yet (wait for DNS)
    systemctl enable caddy

    log_success "Caddy installed and configured for ${DOMAIN}"
    log_warning "Caddy will auto-start after reboot. Start manually with: systemctl start caddy"
}

#===============================================================================
# Create App Directory
#===============================================================================

setup_app_directory() {
    log_info "Creating application directory..."

    mkdir -p ${APP_DIR}

    log_success "App directory created: ${APP_DIR}"
}

#===============================================================================
# Print Summary
#===============================================================================

print_summary() {
    # Get the database credentials
    source /root/.wurm-tools/db-credentials.txt 2>/dev/null || true

    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║              SETUP COMPLETED SUCCESSFULLY!                  ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}Installed Components:${NC}"
    echo "  ✓ PostgreSQL 16"
    echo "  ✓ Node.js $(node --version)"
    echo "  ✓ PM2 Process Manager"
    echo "  ✓ Caddy Web Server"
    echo ""
    echo -e "${BLUE}Database Credentials:${NC}"
    echo "  Database: ${DB_NAME}"
    echo "  User:     ${DB_USER}"
    echo "  Password: ${DB_PASS}"
    echo ""
    echo -e "${YELLOW}DATABASE_URL:${NC}"
    echo "  ${DATABASE_URL}"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo "  1. Configure DNS: Point ${DOMAIN} to this server's IP"
    echo "  2. Run security script: sudo bash 02-security-setup.sh"
    echo "  3. Deploy the app: sudo bash 03-deploy-app.sh"
    echo ""
    echo -e "${YELLOW}Important Files:${NC}"
    echo "  Credentials: /root/.wurm-tools/db-credentials.txt"
    echo "  Caddyfile:   /etc/caddy/Caddyfile"
    echo "  App Dir:     ${APP_DIR}"
    echo ""
}

#===============================================================================
# Main
#===============================================================================

main() {
    print_banner
    check_root

    log_info "Starting VPS setup for ${DOMAIN}..."
    echo ""

    setup_system
    setup_postgresql
    setup_database
    setup_nodejs
    setup_pm2
    setup_caddy
    setup_app_directory

    print_summary
}

main "$@"
