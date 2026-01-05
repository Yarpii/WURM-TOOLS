#!/bin/bash
#===============================================================================
# WURM-TOOLS Backup Script
# For Ubuntu 22.04/24.04 LTS on OVH VPS
#
# This script creates:
# - MySQL database backup
# - Application files backup
# - Configuration backup
#
# Usage:
#   Manual backup:  sudo bash 04-backup.sh
#   Full backup:    sudo bash 04-backup.sh --full
#   Database only:  sudo bash 04-backup.sh --db-only
#   Restore:        sudo bash 04-backup.sh --restore <backup-file>
#
# Setup automatic backups:
#   sudo bash 04-backup.sh --install-cron
#===============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/wurm-tools}"
APP_DIR="/var/www/wurm-tools"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
MAX_BACKUPS="${MAX_BACKUPS:-30}"

# Timestamp for backup files
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATE_ONLY=$(date +%Y%m%d)

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

check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "Please run as root (sudo bash $0)"
        exit 1
    fi
}

setup_backup_dir() {
    mkdir -p "${BACKUP_DIR}/database"
    mkdir -p "${BACKUP_DIR}/application"
    mkdir -p "${BACKUP_DIR}/config"
    chmod 700 "${BACKUP_DIR}"
}

#===============================================================================
# Database Backup
#===============================================================================

backup_database() {
    log_info "Backing up MySQL database..."

    # Load database credentials
    if [ -f /root/.wurm-tools/db-credentials.txt ]; then
        source /root/.wurm-tools/db-credentials.txt
    else
        log_error "Database credentials not found!"
        exit 1
    fi

    BACKUP_FILE="${BACKUP_DIR}/database/wurmtools_${TIMESTAMP}.sql.gz"

    # Create backup using mysqldump
    mysqldump -u "${DB_USER}" -p"${DB_PASS}" --single-transaction --routines --triggers "${DB_NAME}" | gzip > "${BACKUP_FILE}"

    # Verify backup
    if [ -s "${BACKUP_FILE}" ]; then
        SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
        log_success "Database backup created: ${BACKUP_FILE} (${SIZE})"
    else
        log_error "Database backup failed or empty!"
        rm -f "${BACKUP_FILE}"
        exit 1
    fi
}

#===============================================================================
# Application Backup
#===============================================================================

backup_application() {
    log_info "Backing up application files..."

    if [ ! -d "${APP_DIR}" ]; then
        log_warning "Application directory not found: ${APP_DIR}"
        return
    fi

    BACKUP_FILE="${BACKUP_DIR}/application/app_${TIMESTAMP}.tar.gz"

    # Create backup (excluding node_modules and .next)
    tar -czf "${BACKUP_FILE}" \
        --exclude='node_modules' \
        --exclude='.next' \
        --exclude='.git' \
        -C "$(dirname ${APP_DIR})" \
        "$(basename ${APP_DIR})"

    SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    log_success "Application backup created: ${BACKUP_FILE} (${SIZE})"
}

#===============================================================================
# Configuration Backup
#===============================================================================

backup_config() {
    log_info "Backing up configuration files..."

    BACKUP_FILE="${BACKUP_DIR}/config/config_${TIMESTAMP}.tar.gz"

    # Create a temporary directory for configs
    TEMP_DIR=$(mktemp -d)

    # Copy configuration files
    cp -r /root/.wurm-tools "${TEMP_DIR}/" 2>/dev/null || true
    cp /etc/caddy/Caddyfile "${TEMP_DIR}/" 2>/dev/null || true
    cp "${APP_DIR}/.env.local" "${TEMP_DIR}/" 2>/dev/null || true
    cp "${APP_DIR}/ecosystem.config.js" "${TEMP_DIR}/" 2>/dev/null || true

    # MySQL config
    mkdir -p "${TEMP_DIR}/mysql"
    cp /etc/mysql/mysql.conf.d/mysqld.cnf "${TEMP_DIR}/mysql/" 2>/dev/null || true
    cp /etc/mysql/my.cnf "${TEMP_DIR}/mysql/" 2>/dev/null || true

    # Create archive
    tar -czf "${BACKUP_FILE}" -C "${TEMP_DIR}" .

    # Cleanup
    rm -rf "${TEMP_DIR}"

    SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    log_success "Configuration backup created: ${BACKUP_FILE} (${SIZE})"
}

#===============================================================================
# Full Backup
#===============================================================================

full_backup() {
    log_info "Creating full backup..."

    FULL_BACKUP_FILE="${BACKUP_DIR}/full_backup_${TIMESTAMP}.tar.gz"

    # Create individual backups first
    backup_database
    backup_config
    backup_application

    # Combine all recent backups into one archive
    tar -czf "${FULL_BACKUP_FILE}" \
        -C "${BACKUP_DIR}" \
        "database/wurmtools_${TIMESTAMP}.sql.gz" \
        "application/app_${TIMESTAMP}.tar.gz" \
        "config/config_${TIMESTAMP}.tar.gz"

    SIZE=$(du -h "${FULL_BACKUP_FILE}" | cut -f1)
    log_success "Full backup created: ${FULL_BACKUP_FILE} (${SIZE})"
}

#===============================================================================
# Cleanup Old Backups
#===============================================================================

cleanup_old_backups() {
    log_info "Cleaning up old backups (keeping last ${RETENTION_DAYS} days / max ${MAX_BACKUPS})..."

    # Remove backups older than retention days
    find "${BACKUP_DIR}" -name "*.gz" -type f -mtime +${RETENTION_DAYS} -delete

    # Also limit total number of backups per type
    for subdir in database application config; do
        if [ -d "${BACKUP_DIR}/${subdir}" ]; then
            # Count files and delete oldest if over limit
            FILE_COUNT=$(ls -1 "${BACKUP_DIR}/${subdir}"/*.gz 2>/dev/null | wc -l)
            if [ "$FILE_COUNT" -gt "$MAX_BACKUPS" ]; then
                DELETE_COUNT=$((FILE_COUNT - MAX_BACKUPS))
                ls -1t "${BACKUP_DIR}/${subdir}"/*.gz | tail -n ${DELETE_COUNT} | xargs rm -f
                log_info "Removed ${DELETE_COUNT} old ${subdir} backups"
            fi
        fi
    done

    log_success "Cleanup completed"
}

#===============================================================================
# Restore Backup
#===============================================================================

restore_backup() {
    BACKUP_FILE="$1"

    if [ -z "${BACKUP_FILE}" ]; then
        log_error "Please specify a backup file to restore"
        echo "Usage: $0 --restore <backup-file>"
        echo ""
        echo "Available backups:"
        ls -la "${BACKUP_DIR}"/database/*.gz 2>/dev/null || echo "  No database backups found"
        exit 1
    fi

    if [ ! -f "${BACKUP_FILE}" ]; then
        log_error "Backup file not found: ${BACKUP_FILE}"
        exit 1
    fi

    log_warning "This will restore from: ${BACKUP_FILE}"
    read -p "Are you sure you want to continue? This may overwrite existing data! (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Restore cancelled"
        exit 0
    fi

    # Determine backup type by filename
    if [[ "${BACKUP_FILE}" == *"wurmtools_"* ]] && [[ "${BACKUP_FILE}" == *".sql.gz" ]]; then
        restore_database "${BACKUP_FILE}"
    elif [[ "${BACKUP_FILE}" == *"app_"* ]]; then
        restore_application "${BACKUP_FILE}"
    elif [[ "${BACKUP_FILE}" == *"full_backup_"* ]]; then
        restore_full "${BACKUP_FILE}"
    else
        log_error "Unknown backup type: ${BACKUP_FILE}"
        exit 1
    fi
}

restore_database() {
    BACKUP_FILE="$1"
    log_info "Restoring database from: ${BACKUP_FILE}"

    # Load database credentials
    source /root/.wurm-tools/db-credentials.txt

    # Stop the application first
    pm2 stop wurm-tools 2>/dev/null || true

    # Restore database
    gunzip -c "${BACKUP_FILE}" | mysql -u "${DB_USER}" -p"${DB_PASS}" "${DB_NAME}"

    # Restart application
    pm2 start wurm-tools 2>/dev/null || true

    log_success "Database restored successfully"
}

restore_application() {
    BACKUP_FILE="$1"
    log_info "Restoring application from: ${BACKUP_FILE}"

    # Stop the application
    pm2 stop wurm-tools 2>/dev/null || true

    # Backup current app (just in case)
    if [ -d "${APP_DIR}" ]; then
        mv "${APP_DIR}" "${APP_DIR}.bak.$(date +%Y%m%d%H%M%S)"
    fi

    # Extract backup
    mkdir -p "$(dirname ${APP_DIR})"
    tar -xzf "${BACKUP_FILE}" -C "$(dirname ${APP_DIR})"

    # Reinstall dependencies
    cd "${APP_DIR}"
    npm install
    npm run build

    # Restart application
    pm2 start wurm-tools

    log_success "Application restored successfully"
}

restore_full() {
    BACKUP_FILE="$1"
    log_info "Restoring full backup from: ${BACKUP_FILE}"

    # Extract to temp directory
    TEMP_DIR=$(mktemp -d)
    tar -xzf "${BACKUP_FILE}" -C "${TEMP_DIR}"

    # Restore each component
    if [ -f "${TEMP_DIR}/database/"*.sql.gz ]; then
        restore_database "${TEMP_DIR}/database/"*.sql.gz
    fi

    if [ -f "${TEMP_DIR}/application/"*.tar.gz ]; then
        restore_application "${TEMP_DIR}/application/"*.tar.gz
    fi

    # Cleanup
    rm -rf "${TEMP_DIR}"

    log_success "Full restore completed"
}

#===============================================================================
# Install Cron Job
#===============================================================================

install_cron() {
    log_info "Installing automatic backup cron job..."

    SCRIPT_PATH=$(readlink -f "$0")

    # Create cron job for daily backups at 3 AM
    cat > /etc/cron.d/wurm-tools-backup <<EOF
# WURM-TOOLS automatic backup
# Runs daily at 3:00 AM

SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

# Daily database backup
0 3 * * * root ${SCRIPT_PATH} --db-only >> /var/log/wurm-tools/backup.log 2>&1

# Weekly full backup (Sunday at 3:30 AM)
30 3 * * 0 root ${SCRIPT_PATH} --full >> /var/log/wurm-tools/backup.log 2>&1
EOF

    chmod 644 /etc/cron.d/wurm-tools-backup

    # Create log directory
    mkdir -p /var/log/wurm-tools

    log_success "Cron job installed"
    log_info "Daily database backups at 3:00 AM"
    log_info "Weekly full backups on Sundays at 3:30 AM"
}

#===============================================================================
# List Backups
#===============================================================================

list_backups() {
    echo ""
    echo -e "${BLUE}Available Backups:${NC}"
    echo ""

    echo -e "${GREEN}Database Backups:${NC}"
    if ls "${BACKUP_DIR}/database/"*.gz 1> /dev/null 2>&1; then
        ls -lh "${BACKUP_DIR}/database/"*.gz | awk '{print "  " $9 " (" $5 ")"}'
    else
        echo "  No database backups found"
    fi

    echo ""
    echo -e "${GREEN}Application Backups:${NC}"
    if ls "${BACKUP_DIR}/application/"*.gz 1> /dev/null 2>&1; then
        ls -lh "${BACKUP_DIR}/application/"*.gz | awk '{print "  " $9 " (" $5 ")"}'
    else
        echo "  No application backups found"
    fi

    echo ""
    echo -e "${GREEN}Full Backups:${NC}"
    if ls "${BACKUP_DIR}/full_backup_"*.gz 1> /dev/null 2>&1; then
        ls -lh "${BACKUP_DIR}/full_backup_"*.gz | awk '{print "  " $9 " (" $5 ")"}'
    else
        echo "  No full backups found"
    fi

    echo ""
    echo -e "${BLUE}Backup Directory:${NC} ${BACKUP_DIR}"
    echo -e "${BLUE}Total Size:${NC} $(du -sh ${BACKUP_DIR} 2>/dev/null | cut -f1)"
    echo ""
}

#===============================================================================
# Usage
#===============================================================================

usage() {
    echo "WURM-TOOLS Backup Script"
    echo ""
    echo "Usage: $0 [option]"
    echo ""
    echo "Options:"
    echo "  (no option)      Create database backup only (default)"
    echo "  --full           Create full backup (database + app + config)"
    echo "  --db-only        Create database backup only"
    echo "  --app-only       Create application backup only"
    echo "  --config-only    Create configuration backup only"
    echo "  --restore FILE   Restore from a backup file"
    echo "  --list           List available backups"
    echo "  --install-cron   Install automatic backup cron job"
    echo "  --cleanup        Clean up old backups"
    echo "  --help           Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  BACKUP_DIR       Backup directory (default: /var/backups/wurm-tools)"
    echo "  RETENTION_DAYS   Days to keep backups (default: 7)"
    echo "  MAX_BACKUPS      Maximum backups per type (default: 30)"
    echo ""
}

#===============================================================================
# Main
#===============================================================================

main() {
    check_root
    setup_backup_dir

    case "${1:-}" in
        --full)
            full_backup
            cleanup_old_backups
            ;;
        --db-only|"")
            backup_database
            cleanup_old_backups
            ;;
        --app-only)
            backup_application
            cleanup_old_backups
            ;;
        --config-only)
            backup_config
            ;;
        --restore)
            restore_backup "$2"
            ;;
        --list)
            list_backups
            ;;
        --install-cron)
            install_cron
            ;;
        --cleanup)
            cleanup_old_backups
            ;;
        --help|-h)
            usage
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
}

main "$@"
