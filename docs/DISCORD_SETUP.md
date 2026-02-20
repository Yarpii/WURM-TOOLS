# Discord Server Setup Guide
**Purpose:** Step-by-step reference for building the WURM.tools Discord server from scratch,
with the future website ↔ Discord integration already in mind.

---

## 1. Before You Start

You will need:
- A Discord account with 2FA enabled (required for managing a server with bots)
- Access to the [Discord Developer Portal](https://discord.com/developers/applications)
  (you will need this later for the bot / OAuth link — create a free account now)
- About 30 minutes to set up the base structure

---

## 2. Roles to Create

Create these roles **in order** (Discord applies the highest role that matches, so order matters).
Go to **Server Settings → Roles → Create Role** for each.

| # | Role Name        | Colour        | Purpose |
|---|-----------------|---------------|---------|
| 1 | `⚙ Admin`        | Red `#e74c3c`  | Full server control. Only you + trusted co-admins. |
| 2 | `🛡 Moderator`   | Orange `#e67e22` | Can delete messages, timeout, kick. No admin panel access. |
| 3 | `🤖 Bot`         | Grey `#95a5a6`  | Assigned to the WURM.tools bot. Needs specific permissions (see §4). |
| 4 | `✅ Member`       | Green `#2ecc71` | Registered on the WURM.tools website. Auto-assigned by bot on link. |
| 5 | `⚔ Verified Player` | Blue `#3498db` | Linked an in-game character to their website account. |
| 6 | `🌟 Supporter`   | Gold `#f1c40f`  | Optional: donors or Patreon supporters. |
| 7 | `@everyone`      | (default)      | Unregistered visitors — read-only access most places. |

### Role permissions checklist

For each role, go to the role → **Permissions** tab and set:

**`⚙ Admin`**
- ✅ Administrator (this grants everything — be careful who gets this)

**`🛡 Moderator`**
- ✅ View Channels, Send Messages, Read Message History
- ✅ Manage Messages (delete, pin)
- ✅ Kick Members, Timeout Members
- ✅ Manage Threads
- ❌ Administrator, Ban Members, Manage Server (leave for admin only)

**`🤖 Bot`**
- ✅ View Channels, Send Messages, Read Message History
- ✅ Embed Links, Attach Files (for bot output cards)
- ✅ Manage Roles (only up to its own role — needed to assign Member/Verified roles)
- ✅ Use Application Commands
- ❌ Administrator, Manage Server, Manage Channels

**`✅ Member`**
- ✅ Send Messages in member-only channels
- ✅ Add Reactions, Create Threads
- (inherits all @everyone view permissions plus unlocks member channels)

**`⚔ Verified Player`**
- Same as Member + can access the `#verified-lounge` channel (see §3)

**`@everyone`**
- ✅ View Channel (for public channels only — override per channel)
- ✅ Read Message History
- ❌ Send Messages (in most channels — set per channel)
- ❌ Add Reactions, Create Threads

---

## 3. Channel Structure

Create these **categories** and channels. In Discord: **right-click in the channel list → Create Category**, then add channels inside it.

---

### 📋 WELCOME
*@everyone can read. Nobody can type except the bot.*

| Channel | Type | Purpose |
|---------|------|---------|
| `#welcome` | Text | Bot posts a welcome card with a link to register on WURM.tools. Pin the rules here too. |
| `#announcements` | Text | Website updates, game news. Only Admin/Bot can post. Members get notified. |
| `#rules` | Text | Server rules. Read-only. Pin it. |
| `#link-your-account` | Text | Instructions + bot command to link website account (`/link`). |

Permission override for this category:
- @everyone: **View Channel ✅, Send Messages ❌**
- Bot: **Send Messages ✅, Manage Messages ✅**

---

### 💬 GENERAL
*Open to everyone who can read. Members can send.*

| Channel | Type | Purpose |
|---------|------|---------|
| `#general` | Text | Main chat. All topics welcome. |
| `#introductions` | Text | New members say hello. |
| `#off-topic` | Text | Non-Wurm chatter. |
| `#media` | Text | Screenshots, videos, clips. |

Permission override:
- @everyone: **View Channel ✅, Send Messages ❌** (guests read-only)
- Member: **Send Messages ✅, Add Reactions ✅**

---

### ⚒ WURM TOOLS
*The main hub for using the website features through Discord.*

| Channel | Type | Purpose |
|---------|------|---------|
| `#bot-commands` | Text | Run `/skill`, `/crafting`, `/affinity` etc. Keep bot noise here. |
| `#crafting-help` | Text | Ask questions about the crafting calculator results. |
| `#skill-grinding` | Text | Discuss grind strategies, share path planner results. |
| `#cooking-affinity` | Text | Share affinity recipes, ask about CCFP. |
| `#bug-reports` | Text | Report wrong calculator results. Use the pinned template. |
| `#feature-requests` | Text | Suggest new tools or improvements. |

Permission override:
- @everyone: **View Channel ✅, Send Messages ❌**
- Member: **Send Messages ✅**
- Bot: **Send Messages ✅, Embed Links ✅**

---

### 🌍 COMMUNITY
*General Wurm Online discussion.*

| Channel | Type | Purpose |
|---------|------|---------|
| `#game-news` | Text | Patch notes, events. Bot can auto-post from the Wurm forums RSS (future). |
| `#looking-for-group` | Text | Alliance recruitment, co-op projects. |
| `#trading-post` | Text | Buy/sell/trade items. Future: bot posts listings from website market. |
| `#map-finds` | Text | Share deed locations, resource finds. |
| `#alliance-chat` | Text | Reserved for alliance coordination (can restrict to Verified Player). |

Permission override:
- @everyone: **View Channel ✅, Send Messages ❌**
- Member: **Send Messages ✅**

---

### ⚔ VERIFIED PLAYERS
*Only users who have linked an in-game character (Verified Player role).*

| Channel | Type | Purpose |
|---------|------|---------|
| `#verified-lounge` | Text | Exclusive chat. Future: bot can query your character stats here. |
| `#character-showcase` | Text | Share your skill dump, achievements. |

Permission override:
- @everyone: **View Channel ❌, Send Messages ❌** (hidden)
- Verified Player: **View Channel ✅, Send Messages ✅**

---

### 🔧 STAFF
*Hidden from everyone except Admin and Moderator.*

| Channel | Type | Purpose |
|---------|------|---------|
| `#staff-general` | Text | Mod coordination, incident notes. |
| `#bot-logs` | Text | Bot sends audit events here (new links, errors, role changes). |
| `#admin-only` | Text | Admin discussion only. |

Permission override:
- @everyone: **View Channel ❌**
- Moderator: **View Channel ✅, Send Messages ✅**
- Admin: **View Channel ✅, Send Messages ✅**
- Bot: **View Channel ✅, Send Messages ✅** (for `#bot-logs` only)

---

## 4. Bot Application Setup (Discord Developer Portal)

You do not need a working bot yet — but register the app now so the Client ID and secrets are ready
when you code the integration.

1. Go to https://discord.com/developers/applications → **New Application** → name it `WURM.tools`
2. Under **Bot** tab → **Add Bot** → save the **Token** (never commit this to git — goes in `.env`)
3. Under **OAuth2** tab → save the **Client ID** and set the **Client Secret**
4. Set **Redirects** to:
   - `https://wurm.tools/api/auth/discord/callback`
   - `http://localhost:3000/api/auth/discord/callback` (for dev)
5. Under **Bot** tab → enable these **Privileged Gateway Intents**:
   - ✅ Server Members Intent (needed to assign roles programmatically)
   - ✅ Message Content Intent (needed if bot reads commands in channels)

Save these to your `.env` when ready:
```
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_BOT_TOKEN=
DISCORD_GUILD_ID=          # your server's ID (right-click server → Copy Server ID)
DISCORD_MEMBER_ROLE_ID=    # ID of the Member role
DISCORD_VERIFIED_ROLE_ID=  # ID of the Verified Player role
DISCORD_BOT_LOG_CHANNEL=   # ID of #bot-logs channel
```

### Bot invite URL (generate in Developer Portal → OAuth2 → URL Generator)

Scopes: `bot`, `applications.commands`

Bot permissions to check:
- Manage Roles, Send Messages, Embed Links, Attach Files
- Read Message History, View Channels, Use Application Commands

---

## 5. Future Website ↔ Discord Integration Points

When development is ready, these are the integration touchpoints to build:

### a) Discord OAuth login
Allow users to sign in to WURM.tools with their Discord account.
- Flow: user clicks "Connect Discord" → Discord OAuth2 → callback stores `discord_id` on user row
- Enables: auto role assignment, profile badge, direct messaging from site

### b) Auto role assignment
When a user registers or links their account on the website, the bot calls the Discord API to assign the `Member` role to their Discord account.

When they link an in-game character → also assign `Verified Player`.

### c) Bot slash commands
Commands usable in `#bot-commands` (and DMs):

| Command | What it does |
|---------|-------------|
| `/link <website-token>` | Links Discord account to WURM.tools profile |
| `/skill <name> <target>` | Queries the grinder — returns actions needed |
| `/crafting <item> <qty>` | Returns material list from the crafting calculator |
| `/affinity <player-id> <ingredients...>` | Returns affinity result |
| `/sweetspot <skill>` | Returns current sweet spot QL range |
| `/profile` | Shows your linked character's skill summary |

### d) Market listing notifications
When a new item is listed on the website market, the bot posts a card in `#trading-post`.

### e) Website update announcements
CI/CD pipeline (or an admin panel button) posts a release note card to `#announcements` on deploy.

---

## 6. Setup Order Checklist

Follow this order to avoid permission headaches:

- [ ] Create server
- [ ] Create all roles in the order listed in §2
- [ ] Set role permissions as listed
- [ ] Create all categories
- [ ] Create channels inside each category
- [ ] Set category-level permission overrides (channels inherit from category)
- [ ] Verify hidden categories are truly hidden (open an incognito window and join as a test user)
- [ ] Register app in Discord Developer Portal (§4)
- [ ] Save all IDs/tokens to `.env`
- [ ] Invite bot to server using the generated invite URL
- [ ] Post rules in `#rules`, pin it
- [ ] Post account link instructions in `#link-your-account`, pin it
- [ ] Set `#announcements` as the "Community Updates" channel (Server Settings → Community)
