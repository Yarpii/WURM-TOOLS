# Deployment Opties: WURM-TOOLS

## Overzicht

Er zijn twee hoofdbenaderingen om WURM-TOOLS te deployen met een remote database:

```
┌────────────────────────────────────────────────────────────────────┐
│                        OPTIE A (Aanbevolen)                        │
│                    Alles op de VPS                                  │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │                    OVH VPS                                   │  │
│   │  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐  │  │
│   │  │   Caddy     │────│  Next.js    │────│  PostgreSQL     │  │  │
│   │  │  (Reverse   │    │  (PM2)      │    │  (Database)     │  │  │
│   │  │   Proxy)    │    │  Port 3000  │    │  Port 5432      │  │  │
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
│   Nadelen:                                                          │
│   - Geen CDN edge caching (tenzij je Cloudflare Proxy gebruikt)    │
│   - Schalen vereist grotere VPS                                    │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│                           OPTIE B                                   │
│              Cloudflare Pages + VPS Database                        │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌──────────────────────┐         ┌────────────────────────────┐  │
│   │  Cloudflare Pages    │         │        OVH VPS             │  │
│   │  ┌────────────────┐  │   TCP   │  ┌──────────────────────┐  │  │
│   │  │   Next.js      │──┼─────────┼──│    PostgreSQL        │  │  │
│   │  │   (Edge)       │  │  5432   │  │    (Database)        │  │  │
│   │  └────────────────┘  │         │  └──────────────────────┘  │  │
│   │         +            │         │                            │  │
│   │  ┌────────────────┐  │         │                            │  │
│   │  │   Hyperdrive   │  │         │                            │  │
│   │  │ (Connection    │  │         │                            │  │
│   │  │   Pooling)     │  │         │                            │  │
│   │  └────────────────┘  │         │                            │  │
│   └──────────────────────┘         └────────────────────────────┘  │
│                                                                     │
│   Voordelen:                                                        │
│   ✓ Global CDN / Edge computing                                    │
│   ✓ Automatische SSL                                               │
│   ✓ DDoS bescherming                                               │
│   ✓ Makkelijk schalen                                              │
│                                                                     │
│   Nadelen:                                                          │
│   - Vereist Cloudflare Workers betaald plan ($5/maand)             │
│   - Hyperdrive setup nodig                                          │
│   - Latency tussen edge en database                                 │
│   - Beperkte Node.js runtime (geen native modules)                  │
│   - Complexere setup                                                │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

## Aanbeveling

**Voor de meeste gebruikers: Optie A (Alles op VPS)**

Waarom?
1. WURM-TOOLS is geen high-traffic applicatie die edge computing nodig heeft
2. De database calls zijn snel als alles op dezelfde server staat
3. Je hebt volledige SSR ondersteuning
4. Simpeler te onderhouden
5. Je kunt nog steeds Cloudflare als DNS/proxy gebruiken voor CDN caching

## Optie A: Volledige VPS Setup

### Stap 1: PostgreSQL installeren

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
DATABASE_URL=postgresql://wurmtools:JOUW_WACHTWOORD@localhost:5432/wurmtools
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

## Optie B: Cloudflare Pages + Hyperdrive

### Vereisten
- Cloudflare Workers betaald plan ($5/maand)
- Hyperdrive toegang

### Stap 1: PostgreSQL op VPS

Zie [VPS-DATABASE-SETUP.md](./VPS-DATABASE-SETUP.md)

### Stap 2: Hyperdrive configureren

```bash
# Wrangler CLI installeren
npm install -g wrangler

# Login bij Cloudflare
wrangler login

# Hyperdrive database maken
wrangler hyperdrive create wurm-db \
  --connection-string="postgresql://wurmtools:WACHTWOORD@jouw-vps-ip:5432/wurmtools"
```

### Stap 3: wrangler.toml configureren

```toml
name = "wurm-tools"
compatibility_date = "2024-01-01"

[[hyperdrive]]
binding = "HYPERDRIVE"
id = "je-hyperdrive-id"
```

### Stap 4: Code aanpassen voor Hyperdrive

Zie de `src/lib/database-pg.ts` voor de Cloudflare-compatibele versie.

### Stap 5: Deployen

```bash
npm run build
wrangler pages deploy .next
```

---

## Cloudflare als Proxy (Optie A + CDN)

Je kunt Optie A gebruiken EN toch Cloudflare's CDN/DDoS bescherming:

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
