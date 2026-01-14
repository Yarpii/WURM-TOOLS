# WURM-TOOLS VPS Deployment Scripts

Complete set of scripts for deploying WURM-TOOLS on an OVH VPS (or any Ubuntu-based server).

## Quick Start

```bash
# 1. SSH into your VPS
ssh root@your-vps-ip

# 2. Download the scripts
git clone https://github.com/Yarpii/WURM-TOOLS.git
cd WURM-TOOLS/scripts/vps

# 3. Make scripts executable
chmod +x *.sh

# 4. Run setup scripts in order
sudo bash 01-initial-setup.sh
sudo bash 02-security-setup.sh
sudo bash 03-deploy-app.sh

# 5. Configure DNS and test
# Point wurm.tools to your VPS IP
```

## Scripts Overview

| Script | Description | Run Order |
|--------|-------------|-----------|
| `01-initial-setup.sh` | Installs PostgreSQL, Node.js, PM2, Caddy | First |
| `02-security-setup.sh` | Configures firewall, Fail2Ban, SSH hardening | Second |
| `03-deploy-app.sh` | Clones repo, sets up database, starts app | Third |
| `04-backup.sh` | Automated backup and restore system | After deploy |
| `05-maintenance.sh` | Monitoring, logs, updates, health checks | Ongoing |

## Detailed Script Documentation

### 01-initial-setup.sh

**What it installs:**
- PostgreSQL 16 (database)
- Node.js 20 LTS (runtime)
- PM2 (process manager)
- Caddy (web server with auto-SSL)

**What it configures:**
- Creates database user and database
- Saves credentials to `/root/.wurm-tools/db-credentials.txt`
- Creates Caddyfile for your domain

**Usage:**
```bash
# Default (uses wurm.tools)
sudo bash 01-initial-setup.sh

# Custom domain
DOMAIN=mysite.com sudo bash 01-initial-setup.sh
```

---

### 02-security-setup.sh

**What it configures:**

| Component | Configuration |
|-----------|--------------|
| UFW Firewall | Ports 22, 80, 443 only |
| Fail2Ban | SSH brute-force protection (3 attempts = 1hr ban) |
| SSH | Key-based auth, no root login, rate limiting |
| Auto-updates | Daily security updates, weekly reboots if needed |
| Kernel | Hardened sysctl settings |

**Usage:**
```bash
sudo bash 02-security-setup.sh
```

**Important:** After running, set up SSH keys and disable password authentication.

---

### 03-deploy-app.sh

**What it does:**
1. Clones or updates the repository
2. Creates `.env.local` with database connection
3. Installs npm dependencies
4. Imports PostgreSQL schema
5. Builds Next.js application
6. Starts application with PM2
7. Starts Caddy for SSL/reverse proxy

**Usage:**
```bash
# Default deployment
sudo bash 03-deploy-app.sh

# Custom settings
REPO_URL=https://github.com/user/repo.git \
BRANCH=develop \
DOMAIN=mysite.com \
sudo bash 03-deploy-app.sh
```

---

### 04-backup.sh

**Features:**
- Database backups (PostgreSQL dumps)
- Application backups (code + config)
- Full backups (everything combined)
- Automatic cleanup of old backups
- Easy restore functionality

**Usage:**
```bash
# Quick database backup
sudo bash 04-backup.sh

# Full backup
sudo bash 04-backup.sh --full

# List available backups
sudo bash 04-backup.sh --list

# Restore from backup
sudo bash 04-backup.sh --restore /var/backups/wurm-tools/database/wurmtools_20241225.sql.gz

# Install automatic daily backups
sudo bash 04-backup.sh --install-cron
```

**Backup Schedule (after --install-cron):**
- Daily: Database backup at 3:00 AM
- Weekly: Full backup on Sundays at 3:30 AM
- Retention: 7 days / max 30 backups

---

### 05-maintenance.sh

**Commands:**

| Command | Description |
|---------|-------------|
| `status` | Full system and app status |
| `health` | Run health checks |
| `logs [type]` | View logs (app/caddy/postgresql/auth) |
| `update` | Pull code, rebuild, restart |
| `restart [service]` | Restart services |
| `clean` | Clean up disk space |
| `ssl` | Check SSL certificate status |

**Usage:**
```bash
# Check everything
sudo bash 05-maintenance.sh status

# View application logs
sudo bash 05-maintenance.sh logs app

# Update application
sudo bash 05-maintenance.sh update

# Run health checks
sudo bash 05-maintenance.sh health

# Clean up disk space
sudo bash 05-maintenance.sh clean
```

---

## Post-Installation Checklist

After running all scripts:

- [ ] Configure DNS: Point domain A record to VPS IP
- [ ] Verify SSL: Check https://wurm.tools works
- [ ] Set up SSH keys: Add your public key to `~/.ssh/authorized_keys`
- [ ] Disable password auth: Uncomment in `/etc/ssh/sshd_config.d/99-hardening.conf`
- [ ] Install backup cron: `sudo bash 04-backup.sh --install-cron`
- [ ] Test backup/restore: Create and restore a test backup
- [ ] Monitor logs: `sudo bash 05-maintenance.sh logs all`

---

## Common Commands

```bash
# Check application status
pm2 status
pm2 logs wurm-tools

# Restart application
pm2 restart wurm-tools

# View Caddy logs
journalctl -u caddy -f

# Check firewall
ufw status

# Check banned IPs
fail2ban-client status sshd

# Connect to database
psql postgresql://wurmtools:password@localhost/wurmtools
```

---

## Troubleshooting

### Application not starting
```bash
# Check PM2 logs
pm2 logs wurm-tools --lines 100

# Check if port is in use
ss -tlnp | grep 3000

# Restart PM2
pm2 restart wurm-tools
```

### SSL not working
```bash
# Check Caddy status
systemctl status caddy

# Check Caddy logs
journalctl -u caddy -f

# Verify DNS
dig wurm.tools +short
```

### Database connection issues
```bash
# Check PostgreSQL status
systemctl status postgresql

# Test connection
psql postgresql://wurmtools:password@localhost/wurmtools -c "SELECT 1;"

# Check credentials
cat /root/.wurm-tools/db-credentials.txt
```

### SSH locked out
If you get locked out due to Fail2Ban:
1. Access via OVH control panel (KVM/Console)
2. Unban your IP: `fail2ban-client set sshd unbanip YOUR_IP`

---

## Directory Structure

```
/var/www/wurm-tools/          # Application files
├── .env.local                 # Environment configuration
├── ecosystem.config.js        # PM2 configuration
└── ...

/root/.wurm-tools/            # Server configuration
├── db-credentials.txt         # Database credentials
└── security-report.txt        # Security audit report

/var/backups/wurm-tools/      # Backups
├── database/                  # Database backups
├── application/               # App backups
└── config/                    # Config backups

/var/log/wurm-tools/          # Application logs
├── error.log
├── out.log
└── combined.log

/etc/caddy/Caddyfile          # Caddy configuration
```

---

## Security Notes

1. **Never commit credentials**: `.env.local` is in `.gitignore`
2. **Regular updates**: Auto-updates are enabled, but check monthly
3. **Monitor Fail2Ban**: Check banned IPs regularly
4. **Backup regularly**: Verify backups work with test restores
5. **SSH keys**: Use SSH keys instead of passwords

---

## Support

For issues or questions:
- GitHub Issues: https://github.com/Yarpii/WURM-TOOLS/issues
- Documentation: Check `docs/` folder
