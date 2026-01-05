# Deployment Opties: WURM-TOOLS

## Overzicht

WURM-TOOLS wordt gedeployed op een VPS met MySQL/MariaDB als database:

```
┌────────────────────────────────────────────────────────────────────┐
│                        VPS Deployment                               │
│                    Alles op de VPS                                  │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │                    OVH VPS                                   │  │
│   │  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐  │  │
│   │  │   Caddy     │────│  Next.js    │────│     MySQL       │  │  │
│   │  │  (Reverse   │    │  (PM2)      │    │   (Database)    │  │  │
│   │  │   Proxy)    │    │  Port 3000  │    │   Port 3306     │  │  │
│   │  └─────────────┘    └─────────────┘    └─────────────────┘  │  │
│   │        ↑                                                     │  │
│   │   HTTPS:443                                                  │  │
│   └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│   Voordelen:                                                        │
│   ✓ Simpelste setup                                                │
│   ✓ Geen latency tussen app en database                           │
│   ✓ Volledige controle                                             │
│   ✓ Werkt met alle Next.js features (SSR, API routes, etc.)        │
│   ✓ Goedkoper (geen extra services)                                │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

## Volledige VPS Setup

### Stap 1: MySQL installeren

Zie [VPS-DATABASE-SETUP.md](./VPS-DATABASE-SETUP.md)

### Stap 2: Node.js installeren

```bash
# Node.js 20 LTS installeren
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs

# Verify
node --version  # v20.x
npm --version   # 10.x
```

### Stap 3: PM2 installeren (process manager)

```bash
npm install -g pm2
```

### Stap 4: Project deployen

```bash
# Maak deploy directory
mkdir -p /var/www/wurm-tools
cd /var/www/wurm-tools

# Clone of upload je project
git clone https://github.com/JOUW_USERNAME/WURM-TOOLS.git .

# Installeer dependencies
npm install

# Build voor productie
npm run build

# Maak .env.local
cat > .env.local << 'EOF'
NODE_ENV=production
DATABASE_URL=mysql://wurmtools:JOUW_WACHTWOORD@localhost:3306/wurmtools
EOF

# Start met PM2
pm2 start npm --name "wurm-tools" -- start

# Autostart bij reboot
pm2 save
pm2 startup
```

### Stap 5: Caddy installeren (reverse proxy met auto-SSL)

```bash
# Caddy installeren
apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update
apt install caddy

# Configureer Caddy
cat > /etc/caddy/Caddyfile << 'EOF'
jouwdomein.nl {
    reverse_proxy localhost:3000
}
EOF

# Herstart Caddy
systemctl restart caddy
```

### Stap 6: Firewall configureren

```bash
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 22/tcp
ufw enable
```

Nu is je app bereikbaar op `https://jouwdomein.nl`

---

## Cloudflare als Proxy (optioneel)

Je kunt ook Cloudflare's CDN/DDoS bescherming gebruiken:

1. Voeg je domein toe aan Cloudflare
2. Zet DNS record naar je VPS IP
3. Zet Proxy status op "Proxied" (oranje wolk)
4. Configureer Page Rules voor caching

Dit geeft je:
- ✓ Volledige Next.js functionaliteit
- ✓ CDN caching voor static assets
- ✓ DDoS bescherming
- ✓ Gratis SSL
- ✓ Database op dezelfde server (snel)
