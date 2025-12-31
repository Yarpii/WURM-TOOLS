# VPS Database Setup Guide - OVH + Cloudflare Pages

Deze guide helpt je om PostgreSQL op te zetten op je OVH VPS en te verbinden met je Cloudflare Pages deployment.

## Architectuur Overzicht

```
┌─────────────────────────┐      ┌─────────────────────────┐
│   Cloudflare Pages      │      │      OVH VPS            │
│                         │      │                         │
│  ┌─────────────────┐    │      │  ┌─────────────────┐    │
│  │   Next.js App   │────┼──────┼──│   PostgreSQL    │    │
│  │  (Edge/Worker)  │    │ SSL  │  │   Port 5432     │    │
│  └─────────────────┘    │      │  └─────────────────┘    │
│                         │      │                         │
└─────────────────────────┘      └─────────────────────────┘
```

## Stap 1: VPS Configuratie (op je OVH VPS)

### 1.1 SSH naar je VPS

```bash
ssh root@jouw-vps-ip
```

### 1.2 Systeem updaten

```bash
apt update && apt upgrade -y
```

### 1.3 PostgreSQL installeren

```bash
# PostgreSQL 16 installeren (nieuwste stabiele versie)
apt install -y postgresql postgresql-contrib

# Controleer of het draait
systemctl status postgresql
```

### 1.4 Database en gebruiker aanmaken

```bash
# Schakel over naar postgres user
sudo -u postgres psql

# In PostgreSQL shell:
CREATE USER wurmtools WITH PASSWORD 'VERVANG_MET_STERK_WACHTWOORD';
CREATE DATABASE wurmtools OWNER wurmtools;
GRANT ALL PRIVILEGES ON DATABASE wurmtools TO wurmtools;

# Geef schema rechten (belangrijk!)
\c wurmtools
GRANT ALL ON SCHEMA public TO wurmtools;

# Exit
\q
```

### 1.5 PostgreSQL configureren voor remote verbindingen

```bash
# Vind je PostgreSQL config locatie
sudo -u postgres psql -c "SHOW config_file;"
# Meestal: /etc/postgresql/16/main/postgresql.conf

# Bewerk postgresql.conf
nano /etc/postgresql/16/main/postgresql.conf
```

Zoek en wijzig:
```conf
# Luister op alle interfaces (niet alleen localhost)
listen_addresses = '*'

# SSL aanzetten (belangrijk voor productie!)
ssl = on
```

### 1.6 Client authenticatie configureren

```bash
nano /etc/postgresql/16/main/pg_hba.conf
```

Voeg toe aan het einde:
```conf
# TYPE  DATABASE        USER            ADDRESS                 METHOD

# Sta verbindingen toe van overal (met wachtwoord + SSL)
hostssl wurmtools       wurmtools       0.0.0.0/0               scram-sha-256
hostssl wurmtools       wurmtools       ::/0                    scram-sha-256
```

### 1.7 PostgreSQL herstarten

```bash
systemctl restart postgresql
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

# PostgreSQL toestaan
ufw allow 5432/tcp

# Firewall activeren
ufw enable

# Status controleren
ufw status
```

### 2.2 OVH Firewall (indien van toepassing)

Ga naar je OVH Control Panel:
1. Server > IP
2. Klik op "..." naast je IP
3. Firewall configureren
4. Voeg regel toe: TCP poort 5432 toestaan

## Stap 3: SSL Certificaat (Productie)

### Optie A: Self-signed (voor testen)

```bash
# PostgreSQL heeft standaard self-signed certs in:
# /var/lib/postgresql/16/main/server.crt
# /var/lib/postgresql/16/main/server.key

# Controleer of ze bestaan
ls -la /var/lib/postgresql/16/main/server.*
```

### Optie B: Let's Encrypt (aanbevolen voor productie)

```bash
# Certbot installeren
apt install -y certbot

# Certificaat aanvragen (je hebt een domeinnaam nodig)
certbot certonly --standalone -d db.jouwdomein.nl

# Certificaten kopiëren naar PostgreSQL directory
cp /etc/letsencrypt/live/db.jouwdomein.nl/fullchain.pem /var/lib/postgresql/16/main/server.crt
cp /etc/letsencrypt/live/db.jouwdomein.nl/privkey.pem /var/lib/postgresql/16/main/server.key

# Juiste permissies
chown postgres:postgres /var/lib/postgresql/16/main/server.*
chmod 600 /var/lib/postgresql/16/main/server.key

# PostgreSQL herstarten
systemctl restart postgresql
```

## Stap 4: Verbinding Testen

### Vanaf je lokale machine

```bash
# psql client installeren (macOS)
brew install libpq

# Of Ubuntu/Debian
apt install postgresql-client

# Verbinden
psql "host=jouw-vps-ip port=5432 dbname=wurmtools user=wurmtools sslmode=require"
```

### Test query

```sql
SELECT version();
SELECT current_database();
```

## Stap 5: Omgevingsvariabelen

### Voor lokale ontwikkeling (.env.local)

```env
DATABASE_URL="postgresql://wurmtools:JOUW_WACHTWOORD@jouw-vps-ip:5432/wurmtools?sslmode=require"
```

### Voor Cloudflare Pages

1. Ga naar Cloudflare Dashboard
2. Pages > Jouw project > Settings > Environment variables
3. Voeg toe:
   - `DATABASE_URL` = `postgresql://wurmtools:JOUW_WACHTWOORD@jouw-vps-ip:5432/wurmtools?sslmode=require`

## Stap 6: Database Backup (belangrijk!)

### Automatische dagelijkse backup

```bash
# Backup script maken
nano /usr/local/bin/backup-wurmtools.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/postgresql"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/wurmtools_$TIMESTAMP.sql.gz"

mkdir -p $BACKUP_DIR

# Backup maken
sudo -u postgres pg_dump wurmtools | gzip > $BACKUP_FILE

# Oude backups verwijderen (ouder dan 7 dagen)
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Backup gemaakt: $BACKUP_FILE"
```

```bash
# Uitvoerbaar maken
chmod +x /usr/local/bin/backup-wurmtools.sh

# Cron job toevoegen
crontab -e
```

Voeg toe:
```cron
# Dagelijkse backup om 3:00
0 3 * * * /usr/local/bin/backup-wurmtools.sh
```

## Stap 7: Monitoring

### PostgreSQL logs bekijken

```bash
# Live logs volgen
tail -f /var/log/postgresql/postgresql-16-main.log
```

### Actieve connecties zien

```sql
SELECT * FROM pg_stat_activity WHERE datname = 'wurmtools';
```

## Beveiliging Checklist

- [ ] Sterk wachtwoord voor database user
- [ ] SSL/TLS ingeschakeld
- [ ] Firewall alleen noodzakelijke poorten open
- [ ] Regelmatige backups geconfigureerd
- [ ] PostgreSQL updates automatisch (unattended-upgrades)
- [ ] Fail2ban voor SSH bescherming
- [ ] Database user heeft alleen toegang tot eigen database

## Troubleshooting

### Kan niet verbinden

1. Check of PostgreSQL draait: `systemctl status postgresql`
2. Check firewall: `ufw status`
3. Check pg_hba.conf configuratie
4. Check of poort luistert: `netstat -tlnp | grep 5432`

### SSL fouten

1. Controleer certificaat permissies
2. Check of ssl = on in postgresql.conf
3. Gebruik `sslmode=require` in connection string

### Performance problemen

```sql
-- Slow queries vinden
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

## Volgende Stappen

Na het voltooien van deze setup:

1. Run de migratie script: `npm run db:migrate`
2. Importeer bestaande data: `npm run db:import`
3. Test de applicatie lokaal met de remote database
4. Deploy naar Cloudflare Pages
