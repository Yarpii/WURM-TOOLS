# BlackForge Tools

<div align="center">

![BlackForge Tools](https://img.shields.io/badge/WURM-Online-orange?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?style=for-the-badge&logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql)

**The Ultimate Companion Tool for WURM Online**

[Live Demo](https://blackforge.tools) · [Report Bug](https://github.com/Yarpii/WURM-TOOLS/issues) · [Request Feature](https://github.com/Yarpii/WURM-TOOLS/issues)

</div>

---

## About

BlackForge Tools is a comprehensive companion web application for [WURM Online](https://www.wurmonline.com/) players. It provides crafting calculators, market trading, alliance management, project planning, and much more - all in one place.

Built with modern technologies and a focus on user experience, it helps players optimize their gameplay and connect with the community.

---

## Features

### Crafting System

| Feature | Description |
|---------|-------------|
| **Material Calculator** | Calculate exact base materials needed for any craftable item |
| **Advanced Crafting** | Factor in skill levels, tool quality, and difficulty for realistic estimates |
| **Crafting Tree** | Visual breakdown of the complete crafting hierarchy |
| **Reverse Lookup** | Find what items can be crafted from a specific material |
| **Skill Predictions** | Predict success chance, quality output, and skill gains |

### Market & Trading

| Feature | Description |
|---------|-------------|
| **Buy/Sell Orders** | Post and browse buy/sell orders for items |
| **Trade Matching** | Automatic matching of compatible buy and sell orders |
| **Price History** | Track historical prices and market trends |
| **Price Alerts** | Get notified when items reach your target price |
| **Trade Ratings** | Rate traders to build community trust |

### Merchants

| Feature | Description |
|---------|-------------|
| **Merchant Directory** | Browse player-run merchant shops |
| **Stock Lists** | See what merchants have in stock |
| **Location Mapping** | Find merchants on the map |
| **Category Filtering** | Filter by item category, server, location |

### Alliances & Community

| Feature | Description |
|---------|-------------|
| **Alliance Management** | Create and manage alliances/guilds |
| **Member Roles** | Leader, Officer, Member role hierarchy |
| **Invite System** | Send and manage alliance invitations |
| **Alliance Projects** | Collaborative project planning |

### Project Planning

| Feature | Description |
|---------|-------------|
| **Project Tracker** | Plan large crafting or building projects |
| **Material Lists** | Auto-calculate materials for project items |
| **Progress Tracking** | Track completion of project items |
| **Sharing** | Share projects with alliance members |

### Prospect Management

| Feature | Description |
|---------|-------------|
| **Recruitment Tracking** | Track potential alliance recruits |
| **Custom Pages** | Organize prospects into categories |
| **Status Workflow** | Potential → Contacted → Interested → Recruited |
| **Notes & History** | Keep detailed notes on each prospect |

### Map System

| Feature | Description |
|---------|-------------|
| **Location Database** | Mark and share in-game locations |
| **Location Types** | Deeds, merchants, landmarks, resources, spawns |
| **Server Support** | All WURM Online servers supported |
| **Coordinate System** | Precise X/Y coordinate tracking |

### Gamification

| Feature | Description |
|---------|-------------|
| **XP System** | Earn experience for using the platform |
| **Achievements** | Unlock achievements for various activities |
| **Leaderboards** | Compete with other players |
| **Badges** | Display earned badges on your profile |

### User Features

| Feature | Description |
|---------|-------------|
| **User Profiles** | Customizable member profiles |
| **Dashboard** | Personal dashboard with stats and activity |
| **Discord Webhooks** | Get notifications in your Discord server |
| **Settings** | Customize your experience |

### Analytics

| Feature | Description |
|---------|-------------|
| **Market Analytics** | Price trends, volume, popular items |
| **Trending Items** | See what's hot in the market |
| **Personal Stats** | Your trading and crafting statistics |

---

## Screenshots

<details>
<summary>Click to view screenshots</summary>

### Crafting Calculator
Calculate materials with skill-based predictions

### Market System
Browse and post trade orders

### Alliance Management
Manage your guild and members

### Dashboard
Personal stats and activity overview

</details>

---

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 16 | React framework with App Router |
| **React** | 19 | UI library |
| **TypeScript** | 5.9 | Type-safe development |
| **PostgreSQL** | 16 | Production database |
| **SQLite** | - | Local development database |
| **Tailwind CSS** | 4 | Utility-first styling |
| **PM2** | - | Process management |
| **Caddy** | - | Reverse proxy with auto-SSL |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- PostgreSQL 16 (for production)

### Local Development

```bash
# Clone the repository
git clone https://github.com/Yarpii/WURM-TOOLS.git
cd WURM-TOOLS

# Install dependencies
npm install

# Run development server (uses SQLite)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Deployment (VPS)

We provide complete deployment scripts for Ubuntu VPS:

```bash
# On your VPS
cd scripts/vps
chmod +x *.sh

# Run setup scripts
sudo bash 01-initial-setup.sh    # PostgreSQL, Node.js, PM2, Caddy
sudo bash 02-security-setup.sh   # Firewall, Fail2Ban, SSH hardening
sudo bash 03-deploy-app.sh       # Deploy application

# Setup automatic backups
sudo bash 04-backup.sh --install-cron
```

See [scripts/vps/README.md](scripts/vps/README.md) for detailed documentation.

---

## Environment Variables

Create a `.env.local` file:

```env
# Environment
NODE_ENV=production

# Database (PostgreSQL for production)
DATABASE_URL=postgresql://user:password@localhost:5432/wurmtools

# Optional: SSL settings
DATABASE_SSL=true
DATABASE_POOL_MAX=10
```

See [.env.example](.env.example) for all options.

---

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx            # Home / Landing page
│   ├── crafting/           # Crafting calculator
│   ├── market/             # Buy/sell orders
│   ├── merchants/          # Merchant directory
│   ├── alliances/          # Alliance management
│   ├── members/            # Member profiles
│   ├── projects/           # Project planning
│   ├── prospects/          # Recruitment tracking
│   ├── trades/             # Trade matching
│   ├── map/                # Location database
│   ├── achievements/       # Gamification
│   ├── analytics/          # Market analytics
│   ├── dashboard/          # User dashboard
│   ├── settings/           # User settings
│   ├── admin/              # Admin panel
│   ├── data/               # Import/export
│   ├── login/              # Authentication
│   ├── register/           # Registration
│   └── api/                # 42 API routes
├── lib/
│   ├── database.ts         # SQLite database layer
│   ├── database-pg.ts      # PostgreSQL database layer
│   ├── db-config.ts        # Database configuration
│   ├── auth.ts             # Authentication logic
│   ├── security.ts         # Security utilities
│   ├── types.ts            # TypeScript interfaces
│   └── wurm-formulas.ts    # Game mechanics calculations
├── components/             # Reusable React components
└── middleware.ts           # Rate limiting & security headers

scripts/
├── schema.sql              # PostgreSQL schema
├── migrate-to-postgres.ts  # SQLite → PostgreSQL migration
└── vps/                    # VPS deployment scripts
    ├── 01-initial-setup.sh
    ├── 02-security-setup.sh
    ├── 03-deploy-app.sh
    ├── 04-backup.sh
    └── 05-maintenance.sh

docs/
├── VPS-DATABASE-SETUP.md   # PostgreSQL setup guide
└── DEPLOYMENT-OPTIONS.md   # Deployment architecture
```

---

## API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/session` | Check session |

### Crafting
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/items` | List all items |
| GET | `/api/calculate?id=X&qty=Y` | Calculate materials |
| GET | `/api/advanced-calculate` | Calculate with skill factors |
| GET | `/api/reverse?id=X` | Reverse lookup |

### Market
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/orders` | List orders |
| POST | `/api/orders` | Create order |
| GET | `/api/merchants` | List merchants |
| GET | `/api/matches` | Get trade matches |
| GET | `/api/price_alerts` | Price alerts |

### Community
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/alliances` | List alliances |
| GET | `/api/members` | List members |
| GET | `/api/projects` | List projects |
| GET | `/api/prospects` | List prospects |
| GET | `/api/map` | Map locations |

### Gamification
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/achievements` | Achievements |
| GET | `/api/leaderboard` | Leaderboard |
| GET | `/api/dashboard` | Dashboard data |

All list endpoints support pagination: `?paginate=true&page=1&limit=50`

---

## Security

### Authentication & Authorization
- Session-based authentication with httpOnly cookies
- PBKDF2-SHA512 password hashing with random salts
- Role-based access control (admin/user)

### Protection Measures
- **Firewall**: UFW with only ports 22, 80, 443
- **Brute-force**: Fail2Ban for SSH and login protection
- **Rate Limiting**: 100 requests/minute per IP
- **CSRF**: Strict SameSite cookies
- **XSS**: Content Security Policy headers
- **SQL Injection**: Parameterized queries only

### Security Headers
```
Content-Security-Policy: default-src 'self'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=31536000
Referrer-Policy: strict-origin-when-cross-origin
```

---

## Maintenance

```bash
# Check system status
sudo bash scripts/vps/05-maintenance.sh status

# View logs
sudo bash scripts/vps/05-maintenance.sh logs app

# Update application
sudo bash scripts/vps/05-maintenance.sh update

# Run health checks
sudo bash scripts/vps/05-maintenance.sh health

# Create backup
sudo bash scripts/vps/04-backup.sh --full

# Restore from backup
sudo bash scripts/vps/04-backup.sh --restore <backup-file>
```

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- [WURM Online](https://www.wurmonline.com/) - The game we love
- [Next.js](https://nextjs.org/) - React framework
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [PostgreSQL](https://www.postgresql.org/) - Database

---

<div align="center">

**Made with ❤️ for the WURM Online Community**

[Website](https://blackforge.tools) · [GitHub](https://github.com/Yarpii/WURM-TOOLS)

</div>
