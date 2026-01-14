#!/bin/bash
#===============================================================================
# WURM-TOOLS Maintenance & Monitoring Script
# For Ubuntu 22.04/24.04 LTS on OVH VPS
#
# This script provides:
# - System health checks
# - Application status monitoring
# - Log management
# - Quick update/restart commands
#
# Usage: sudo bash 05-maintenance.sh [command]
#===============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
APP_DIR="/var/www/wurm-tools"
DOMAIN="${DOMAIN:-wurm.tools}"

#===============================================================================
# Helper Functions
#===============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

print_header() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
}

check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "Please run as root (sudo bash $0)"
        exit 1
    fi
}

#===============================================================================
# Status Command
#===============================================================================

cmd_status() {
    print_header "WURM-TOOLS System Status"

    echo -e "${BLUE}System Information:${NC}"
    echo "  Hostname:    $(hostname)"
    echo "  IP Address:  $(hostname -I | awk '{print $1}')"
    echo "  Uptime:      $(uptime -p)"
    echo "  Load:        $(cat /proc/loadavg | awk '{print $1, $2, $3}')"
    echo ""

    echo -e "${BLUE}Resource Usage:${NC}"
    echo "  CPU:         $(top -bn1 | grep "Cpu(s)" | awk '{print 100 - $8 "%"}')"
    echo "  Memory:      $(free -h | awk '/^Mem:/ {print $3 " / " $2 " (" int($3/$2*100) "%)"}')"
    echo "  Disk:        $(df -h / | awk 'NR==2 {print $3 " / " $2 " (" $5 ")"}')"
    echo ""

    echo -e "${BLUE}Service Status:${NC}"

    # MySQL
    if systemctl is-active --quiet mysql; then
        log_success "MySQL is running"
    else
        log_error "MySQL is NOT running"
    fi

    # Caddy
    if systemctl is-active --quiet caddy; then
        log_success "Caddy is running"
    else
        log_error "Caddy is NOT running"
    fi

    # PM2 / Application
    if pm2 show wurm-tools &>/dev/null; then
        STATUS=$(pm2 show wurm-tools | grep "status" | head -1 | awk '{print $4}')
        if [ "$STATUS" == "online" ]; then
            log_success "Application is running (PM2: ${STATUS})"
        else
            log_warning "Application status: ${STATUS}"
        fi
    else
        log_error "Application is NOT running in PM2"
    fi

    # Fail2Ban
    if systemctl is-active --quiet fail2ban; then
        BANNED=$(fail2ban-client status sshd 2>/dev/null | grep "Currently banned" | awk '{print $4}')
        log_success "Fail2Ban is running (${BANNED:-0} IPs banned)"
    else
        log_warning "Fail2Ban is NOT running"
    fi

    # UFW Firewall
    if ufw status | grep -q "Status: active"; then
        log_success "UFW Firewall is active"
    else
        log_warning "UFW Firewall is NOT active"
    fi

    echo ""
    echo -e "${BLUE}Website Status:${NC}"

    # Check if website responds
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000" 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "304" ]; then
        log_success "Local app responding (HTTP ${HTTP_CODE})"
    else
        log_error "Local app not responding (HTTP ${HTTP_CODE})"
    fi

    # Check HTTPS
    HTTPS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://${DOMAIN}" --connect-timeout 5 2>/dev/null || echo "000")
    if [ "$HTTPS_CODE" == "200" ] || [ "$HTTPS_CODE" == "304" ]; then
        log_success "HTTPS working for ${DOMAIN} (HTTP ${HTTPS_CODE})"
    else
        log_warning "HTTPS check: ${HTTPS_CODE} (DNS may not be configured yet)"
    fi

    echo ""
    echo -e "${BLUE}Database Status:${NC}"
    if [ -f /root/.wurm-tools/db-credentials.txt ]; then
        source /root/.wurm-tools/db-credentials.txt
        CONN_COUNT=$(mysql -u "${DB_USER}" -p"${DB_PASS}" -N -e "SELECT COUNT(*) FROM information_schema.processlist WHERE DB = '${DB_NAME}';" 2>/dev/null || echo "0")
        TABLE_COUNT=$(mysql -u "${DB_USER}" -p"${DB_PASS}" -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '${DB_NAME}';" 2>/dev/null || echo "0")
        log_success "Database connected (${CONN_COUNT} connections, ${TABLE_COUNT} tables)"
    else
        log_warning "Database credentials not found"
    fi

    echo ""
}

#===============================================================================
# Logs Command
#===============================================================================

cmd_logs() {
    case "${1:-app}" in
        app|application)
            print_header "Application Logs (PM2)"
            pm2 logs wurm-tools --lines 50 --nostream
            ;;
        caddy)
            print_header "Caddy Web Server Logs"
            if [ -f "/var/log/caddy/${DOMAIN}.log" ]; then
                tail -50 "/var/log/caddy/${DOMAIN}.log"
            else
                journalctl -u caddy --no-pager -n 50
            fi
            ;;
        mysql|db)
            print_header "MySQL Logs"
            tail -50 /var/log/mysql/error.log 2>/dev/null || journalctl -u mysql --no-pager -n 50
            ;;
        auth|security)
            print_header "Authentication Logs"
            tail -50 /var/log/auth.log
            ;;
        fail2ban)
            print_header "Fail2Ban Logs"
            tail -50 /var/log/fail2ban.log
            ;;
        all)
            cmd_logs app
            cmd_logs caddy
            cmd_logs db
            ;;
        *)
            echo "Usage: $0 logs [app|caddy|mysql|auth|fail2ban|all]"
            ;;
    esac
}

#===============================================================================
# Update Command
#===============================================================================

cmd_update() {
    print_header "Updating WURM-TOOLS Application"

    log_info "Pulling latest changes from git..."
    cd ${APP_DIR}
    git fetch origin
    git pull origin main

    log_info "Installing dependencies..."
    npm install

    log_info "Building application..."
    npm run build

    log_info "Restarting application..."
    pm2 restart wurm-tools

    log_success "Update completed!"

    # Show status
    pm2 show wurm-tools
}

#===============================================================================
# Restart Command
#===============================================================================

cmd_restart() {
    case "${1:-all}" in
        app|application)
            log_info "Restarting application..."
            pm2 restart wurm-tools
            log_success "Application restarted"
            ;;
        caddy)
            log_info "Restarting Caddy..."
            systemctl restart caddy
            log_success "Caddy restarted"
            ;;
        mysql|db)
            log_info "Restarting MySQL..."
            systemctl restart mysql
            log_success "MySQL restarted"
            ;;
        all)
            cmd_restart mysql
            cmd_restart app
            cmd_restart caddy
            ;;
        *)
            echo "Usage: $0 restart [app|caddy|mysql|all]"
            ;;
    esac
}

#===============================================================================
# Clean Command
#===============================================================================

cmd_clean() {
    print_header "Cleaning Up System"

    log_info "Cleaning apt cache..."
    apt autoremove -y
    apt autoclean

    log_info "Cleaning npm cache..."
    npm cache clean --force 2>/dev/null || true

    log_info "Cleaning old logs..."
    journalctl --vacuum-time=7d

    log_info "Cleaning PM2 logs..."
    pm2 flush

    # Clean old log files
    find /var/log -name "*.gz" -type f -mtime +7 -delete 2>/dev/null || true
    find /var/log -name "*.old" -type f -mtime +7 -delete 2>/dev/null || true

    log_success "Cleanup completed"

    echo ""
    echo -e "${BLUE}Disk Usage After Cleanup:${NC}"
    df -h /
}

#===============================================================================
# Health Check Command
#===============================================================================

cmd_health() {
    print_header "System Health Check"

    ERRORS=0

    echo -e "${BLUE}Checking services...${NC}"

    # Check MySQL
    if ! systemctl is-active --quiet mysql; then
        log_error "MySQL is down!"
        ERRORS=$((ERRORS + 1))
    else
        log_success "MySQL: OK"
    fi

    # Check Caddy
    if ! systemctl is-active --quiet caddy; then
        log_error "Caddy is down!"
        ERRORS=$((ERRORS + 1))
    else
        log_success "Caddy: OK"
    fi

    # Check PM2
    if ! pm2 show wurm-tools &>/dev/null; then
        log_error "Application not in PM2!"
        ERRORS=$((ERRORS + 1))
    else
        PM2_STATUS=$(pm2 show wurm-tools | grep "status" | head -1 | awk '{print $4}')
        if [ "$PM2_STATUS" != "online" ]; then
            log_error "Application is not online (status: ${PM2_STATUS})"
            ERRORS=$((ERRORS + 1))
        else
            log_success "Application: OK"
        fi
    fi

    echo ""
    echo -e "${BLUE}Checking resources...${NC}"

    # Check disk space
    DISK_USAGE=$(df / | awk 'NR==2 {print int($5)}')
    if [ "$DISK_USAGE" -gt 90 ]; then
        log_error "Disk usage critical: ${DISK_USAGE}%"
        ERRORS=$((ERRORS + 1))
    elif [ "$DISK_USAGE" -gt 80 ]; then
        log_warning "Disk usage high: ${DISK_USAGE}%"
    else
        log_success "Disk usage: ${DISK_USAGE}%"
    fi

    # Check memory
    MEM_USAGE=$(free | awk '/^Mem:/ {print int($3/$2*100)}')
    if [ "$MEM_USAGE" -gt 90 ]; then
        log_error "Memory usage critical: ${MEM_USAGE}%"
        ERRORS=$((ERRORS + 1))
    elif [ "$MEM_USAGE" -gt 80 ]; then
        log_warning "Memory usage high: ${MEM_USAGE}%"
    else
        log_success "Memory usage: ${MEM_USAGE}%"
    fi

    # Check load average
    LOAD=$(cat /proc/loadavg | awk '{print $1}')
    CORES=$(nproc)
    LOAD_INT=${LOAD%.*}
    if [ "${LOAD_INT:-0}" -gt "$((CORES * 2))" ]; then
        log_error "Load average high: ${LOAD}"
        ERRORS=$((ERRORS + 1))
    else
        log_success "Load average: ${LOAD}"
    fi

    echo ""
    echo -e "${BLUE}Checking connectivity...${NC}"

    # Check local app
    if ! curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000" | grep -q "200\|304"; then
        log_error "Local app not responding"
        ERRORS=$((ERRORS + 1))
    else
        log_success "Local app: OK"
    fi

    # Check database connectivity
    if [ -f /root/.wurm-tools/db-credentials.txt ]; then
        source /root/.wurm-tools/db-credentials.txt
        if ! mysql -u "${DB_USER}" -p"${DB_PASS}" -e "SELECT 1;" "${DB_NAME}" &>/dev/null; then
            log_error "Database connection failed"
            ERRORS=$((ERRORS + 1))
        else
            log_success "Database connection: OK"
        fi
    fi

    echo ""
    if [ "$ERRORS" -eq 0 ]; then
        echo -e "${GREEN}✓ All health checks passed!${NC}"
    else
        echo -e "${RED}✗ ${ERRORS} health check(s) failed!${NC}"
        exit 1
    fi
}

#===============================================================================
# SSL Command
#===============================================================================

cmd_ssl() {
    print_header "SSL Certificate Status"

    if command -v certbot &>/dev/null; then
        echo -e "${BLUE}Let's Encrypt Certificates:${NC}"
        certbot certificates
    fi

    echo ""
    echo -e "${BLUE}Caddy Managed Certificates:${NC}"
    if [ -d /var/lib/caddy/.local/share/caddy/certificates ]; then
        find /var/lib/caddy/.local/share/caddy/certificates -name "*.crt" -exec echo "  {}" \;
    else
        echo "  Caddy will automatically manage SSL certificates"
    fi

    echo ""
    echo -e "${BLUE}Testing SSL for ${DOMAIN}:${NC}"
    if curl -sI "https://${DOMAIN}" 2>/dev/null | head -1 | grep -q "200\|301\|302"; then
        log_success "SSL is working for ${DOMAIN}"

        # Show certificate info
        echo ""
        echo | openssl s_client -servername ${DOMAIN} -connect ${DOMAIN}:443 2>/dev/null | openssl x509 -noout -dates 2>/dev/null || true
    else
        log_warning "SSL not yet configured or DNS not pointing to this server"
    fi
}

#===============================================================================
# Usage
#===============================================================================

usage() {
    echo "WURM-TOOLS Maintenance Script"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  status              Show system and application status"
    echo "  health              Run health checks"
    echo "  logs [type]         View logs (app|caddy|mysql|auth|fail2ban|all)"
    echo "  update              Pull latest code and rebuild"
    echo "  restart [service]   Restart services (app|caddy|mysql|all)"
    echo "  clean               Clean up disk space"
    echo "  ssl                 Check SSL certificate status"
    echo ""
    echo "Examples:"
    echo "  $0 status           # Show full status"
    echo "  $0 logs app         # View application logs"
    echo "  $0 restart app      # Restart only the app"
    echo "  $0 update           # Update and rebuild"
    echo ""
}

#===============================================================================
# Main
#===============================================================================

main() {
    check_root

    case "${1:-}" in
        status)
            cmd_status
            ;;
        health|check)
            cmd_health
            ;;
        logs|log)
            cmd_logs "${2:-app}"
            ;;
        update)
            cmd_update
            ;;
        restart)
            cmd_restart "${2:-all}"
            ;;
        clean|cleanup)
            cmd_clean
            ;;
        ssl|cert|certs)
            cmd_ssl
            ;;
        help|--help|-h|"")
            usage
            ;;
        *)
            log_error "Unknown command: $1"
            usage
            exit 1
            ;;
    esac
}

main "$@"
