# VPS Database Setup Guide - MySQL/MariaDB

Deze guide helpt je om MySQL/MariaDB op te zetten op je VPS voor WURM-TOOLS.

## Architectuur Overzicht

```
┌─────────────────────────────────────────────────────────────────┐
│                         OVH VPS                                  │
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐  │
│  │   Caddy     │────│  Next.js    │────│   MySQL/MariaDB     │  │
│  │  (Reverse   │    │  (PM2)      │    │   Port 3306         │  │
│  │   Proxy)    │    │  Port 3000  │    │                     │  │
│  └─────────────┘    └─────────────┘    └─────────────────────┘  │
│        ↑                                                         │
│   HTTPS:443                                                      │
└─────────────────────────────────────────────────────────────────┘
```

## Stap 1: VPS Configuratie

### 1.1 SSH naar je VPS

```bash
ssh root@jouw-vps-ip
```

### 1.2 Systeem updaten

```bash
apt update && apt upgrade -y
```

### 1.3 MySQL installeren

```bash
# MySQL 8.0 installeren
apt install -y mysql-server mysql-client

# Controleer of het draait
systemctl status mysql
```

### 1.4 MySQL beveiligen

```bash
# Beveiligingsscript uitvoeren
mysql_secure_installation
```

Beantwoord de vragen:
- Validate password component: `Y`
- Password strength: `MEDIUM` of `STRONG`
- Remove anonymous users: `Y`
- Disallow root login remotely: `Y`
- Remove test database: `Y`
- Reload privilege tables: `Y`

### 1.5 Database en gebruiker aanmaken

```bash
# Login als root
mysql -u root -p

# In MySQL shell:
CREATE DATABASE wurmtools
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

CREATE USER 'wurmtools'@'localhost' IDENTIFIED BY 'VERVANG_MET_STERK_WACHTWOORD';

GRANT ALL PRIVILEGES ON wurmtools.* TO 'wurmtools'@'localhost';

FLUSH PRIVILEGES;

# Exit
EXIT;
```

### 1.6 Schema importeren

```bash
# Importeer het database schema
mysql -u wurmtools -p wurmtools < /var/www/wurm-tools/scripts/schema-mysql.sql
```

## Stap 2: Firewall Configuratie

### 2.1 UFW Firewall instellen

```bash
# UFW installeren indien nodig
apt install -y ufw

# Basis regels
ufw default deny incoming
ufw default allow outgoing

# SSH toestaan (belangrijk!)
ufw allow 22/tcp

# HTTP/HTTPS toestaan
ufw allow 80/tcp
ufw allow 443/tcp

# MySQL NIET openen naar buiten (alleen lokaal)
# ufw allow 3306/tcp  # NIET DOEN

# Firewall activeren
ufw enable

# Status controleren
ufw status
```

## Stap 3: Omgevingsvariabelen

### .env.local configureren

```env
# Database (MySQL/MariaDB)
DATABASE_URL=mysql://wurmtools:JOUW_WACHTWOORD@localhost:3306/wurmtools

# Environment
NODE_ENV=production
```

## Stap 4: Database Backup

### Automatische dagelijkse backup

Het backup script is al geconfigureerd in `scripts/vps/04-backup.sh`:

```bash
# Installeer automatische backups
sudo bash scripts/vps/04-backup.sh --install-cron

# Handmatige backup
sudo bash scripts/vps/04-backup.sh --full

# Bekijk beschikbare backups
sudo bash scripts/vps/04-backup.sh --list
```

## Stap 5: Monitoring

### MySQL logs bekijken

```bash
# Live logs volgen
tail -f /var/log/mysql/error.log
```

### Actieve connecties zien

```sql
-- In MySQL shell
SELECT * FROM information_schema.processlist WHERE DB = 'wurmtools';
```

### Database grootte checken

```sql
SELECT
    table_schema AS 'Database',
    ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)'
FROM information_schema.tables
WHERE table_schema = 'wurmtools'
GROUP BY table_schema;
```

## Beveiliging Checklist

- [x] Sterk wachtwoord voor database user
- [x] MySQL alleen toegankelijk via localhost
- [x] Firewall blokkeert port 3306 van buiten
- [x] Regelmatige backups geconfigureerd
- [x] MySQL updates automatisch (unattended-upgrades)
- [x] Fail2ban voor SSH bescherming
- [x] Database user heeft alleen toegang tot eigen database

## Troubleshooting

### Kan niet verbinden met database

1. Check of MySQL draait: `systemctl status mysql`
2. Check credentials in `.env.local`
3. Test verbinding: `mysql -u wurmtools -p wurmtools`

### Performance problemen

```sql
-- Slow queries vinden
SHOW PROCESSLIST;

-- Query cache status
SHOW STATUS LIKE 'Qcache%';

-- Table status
SHOW TABLE STATUS FROM wurmtools;
```

### Database repareren

```bash
# Check en repareer tabellen
mysqlcheck -u wurmtools -p --auto-repair wurmtools
```

## MariaDB Alternatief

Als je liever MariaDB gebruikt:

```bash
# MariaDB installeren ipv MySQL
apt install -y mariadb-server mariadb-client

# Beveiligen
mysql_secure_installation

# Verder identiek aan MySQL setup
```

MariaDB is volledig compatibel met de WURM-TOOLS codebase.

## Volgende Stappen

Na het voltooien van deze setup:

1. Importeer het schema: `mysql -u wurmtools -p wurmtools < scripts/schema-mysql.sql`
2. Start de applicatie: `pm2 start npm --name "wurm-tools" -- start`
3. Configureer Caddy voor HTTPS
4. Setup automatische backups
