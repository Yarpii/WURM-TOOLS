# Blackforge - Toekomstige Features & Verbeteringen

> Dit document bevat alle geplande features en ideeën voor Blackforge.
> Gegenereerd op: 30 december 2025

---

## Status Overzicht

| Feature | Status | Prioriteit |
|---------|--------|------------|
| Prijsgeschiedenis & Analytics | 🚧 In Development | Hoog |
| Project Planner | 🚧 In Development | Hoog |
| Trade Matching Systeem | 🚧 In Development | Hoog |
| Interactieve Wereld Map | 📋 Gepland | Medium |
| Mobile PWA | 📋 Gepland | Medium |
| Gamification & Achievements | 📋 Gepland | Medium |
| Discord Integraties | 📋 Gepland | Medium |
| Knowledge Base / Wiki | 📋 Gepland | Laag |
| Bulk Operations Calculator | 📋 Gepland | Laag |
| Smart Notifications | 📋 Gepland | Laag |

---

## 🚧 Fase 1: Quick Wins (Huidige Sprint)

### 1. Prijsgeschiedenis & Markt Analytics
**Prioriteit:** Hoog | **Geschatte Effort:** Medium

Een uitgebreid analytics systeem voor de marketplace:

**Features:**
- [ ] Prijsgeschiedenis grafieken per item (lijn/area charts)
- [ ] Gemiddelde prijs berekening over tijd
- [ ] "Trending items" - meest verhandelde items
- [ ] Prijsalerts: notificatie bij prijswijzigingen
- [ ] Supply/demand indicatoren
- [ ] "Best deals" van de dag
- [ ] Historische data opslag in database

**Technische Requirements:**
- Nieuwe database tabel: `price_history`
- Chart library (bijv. recharts of chart.js)
- Cron job / scheduled task voor prijssnapshots
- API endpoints voor analytics data

---

### 2. Project Planner
**Prioriteit:** Hoog | **Geschatte Effort:** Medium

Plan grote crafting/bouw projecten met totaaloverzicht:

**Features:**
- [ ] Project aanmaken met naam en beschrijving
- [ ] Items toevoegen aan project met hoeveelheden
- [ ] Automatische berekening van ALLE benodigde materialen (recursief)
- [ ] Progressie tracking met checkboxes
- [ ] Tijdsinschatting voor hele project
- [ ] Deel projecten met alliance members
- [ ] Project templates voor veelvoorkomende builds
- [ ] Export naar checklist

**Technische Requirements:**
- Nieuwe database tabellen: `projects`, `project_items`, `project_progress`
- Integratie met bestaande crafting calculator
- Project sharing via alliance systeem
- Progress persistence

---

### 3. Trade Matching Systeem
**Prioriteit:** Hoog | **Geschatte Effort:** Medium-Hoog

Automatische matching tussen kopers en verkopers:

**Features:**
- [ ] Automatische buy/sell order matching
- [ ] Match notificaties: "Iemand verkoopt wat jij zoekt!"
- [ ] Barter suggestions: "Jij hebt X, hij heeft Y"
- [ ] Match score berekening (prijs, locatie, kwaliteit)
- [ ] One-click contact opnemen
- [ ] Match history
- [ ] Reputation/rating systeem voor traders

**Technische Requirements:**
- Matching algoritme
- Nieuwe database tabel: `trade_matches`, `user_ratings`
- Notification systeem
- Match scoring engine

---

## 📋 Fase 2: Geplande Features

### 4. Interactieve Wereld Map
**Prioriteit:** Medium | **Geschatte Effort:** Hoog

Live map van Wurm servers met community data:

**Features:**
- [ ] Kaart per server (Harmony, Melody, Cadence, etc.)
- [ ] Merchant locaties met pins en info popups
- [ ] Alliance territories visualisatie
- [ ] Deed locaties (community-contributed)
- [ ] Resource hotspots
- [ ] Filter systeem (merchants, deeds, resources)
- [ ] Zoom en pan functionaliteit
- [ ] "Near me" functie

**Technische Requirements:**
- Map library (Leaflet of MapLibre)
- Coordinate systeem matching met Wurm
- Database voor locaties
- Community contribution systeem
- Moderatie voor submissions

---

### 5. Mobile Companion App / PWA
**Prioriteit:** Medium | **Geschatte Effort:** Medium

Progressive Web App voor mobiel gebruik:

**Features:**
- [ ] Offline crafting calculator
- [ ] Push notifications voor trades/alliances
- [ ] Quick-access skill tracker
- [ ] "What can I craft?" met huidige inventory
- [ ] Installeerbaar op home screen
- [ ] Responsive mobile-first design
- [ ] Service worker voor caching

**Technische Requirements:**
- PWA manifest
- Service worker implementatie
- Push notification API
- Offline data storage (IndexedDB)
- Mobile-optimized UI components

---

### 6. Gamification & Achievements
**Prioriteit:** Medium | **Geschatte Effort:** Medium

Maak de app engaging met achievements en rewards:

**Features:**
- [ ] Achievement badges voor milestones
- [ ] "Top Trader of the Week" leaderboard
- [ ] Crafting milestones tracking
- [ ] Alliance leaderboards
- [ ] XP systeem voor activiteit
- [ ] Profile badges display
- [ ] Achievement notifications
- [ ] Seasonal events/challenges

**Technische Requirements:**
- Database tabellen: `achievements`, `user_achievements`, `leaderboards`
- Achievement unlock logic
- Leaderboard calculations
- Badge/icon design
- Notification integration

---

### 7. Discord Integraties
**Prioriteit:** Medium | **Geschatte Effort:** Medium

Verbind Blackforge met Discord:

**Features:**
- [ ] Discord bot voor price checks (`!price iron ore`)
- [ ] Alliance Discord channel sync
- [ ] Trade alerts naar Discord webhooks
- [ ] New merchant notifications
- [ ] OAuth login met Discord
- [ ] Rich embeds voor shares

**Technische Requirements:**
- Discord.js bot
- Webhook support
- Discord OAuth integration
- Bot hosting/deployment
- Rate limiting

---

## 📋 Fase 3: Toekomstige Features

### 8. Knowledge Base / Wiki Hybrid
**Prioriteit:** Laag | **Geschatte Effort:** Hoog

Community-driven kennisbank:

**Features:**
- [ ] Tips en tricks per item
- [ ] Best practices voor skill grinding
- [ ] Video/image embeds
- [ ] Upvote/downvote systeem
- [ ] Contributor credits
- [ ] Markdown editor
- [ ] Versie geschiedenis
- [ ] Moderatie systeem

---

### 9. Bulk Operations & Fleet Calculator
**Prioriteit:** Laag | **Geschatte Effort:** Medium

Geavanceerde bulk calculaties:

**Features:**
- [ ] "Ik heb X materialen, wat kan ik maken?"
- [ ] Profit calculator per item
- [ ] Batch crafting optimizer
- [ ] Resource allocation over projecten
- [ ] Efficiency rankings
- [ ] Time vs. profit analysis

---

### 10. Smart Notifications Systeem
**Prioriteit:** Laag | **Geschatte Effort:** Medium

Uitgebreid notificatie systeem:

**Features:**
- [ ] Alliance member activity alerts
- [ ] Nieuwe merchants in jouw gebied
- [ ] Watchlist prijswijzigingen
- [ ] Order expirations
- [ ] Customizable preferences
- [ ] Email digest optie
- [ ] In-app notification center

---

## 🎨 UI/UX Verbeteringen (Doorlopend)

### Quick Improvements
- [ ] Persoonlijk dashboard met overzicht
- [ ] Keyboard shortcuts voor power users
- [ ] Drag & drop voor crafting lijsten
- [ ] Favoriet items quick access
- [ ] Better loading states
- [ ] Skeleton loaders

### Design Enhancements
- [ ] Animated page transitions
- [ ] Micro-interactions
- [ ] Improved mobile navigation
- [ ] Accessibility improvements (ARIA)
- [ ] Print-friendly views

---

## 📝 Notities

### Prioritering Criteria
1. **Gebruikerswaarde:** Hoeveel waarde levert het voor spelers?
2. **Uniekheid:** Onderscheidt het Blackforge van alternatieven?
3. **Technische haalbaarheid:** Hoe complex is de implementatie?
4. **Dependencies:** Zijn er andere features nodig eerst?

### Contributing
Heb je ideeën voor nieuwe features? Open een issue op GitHub of bespreek het met het team.

---

*Laatste update: 30 december 2025*
