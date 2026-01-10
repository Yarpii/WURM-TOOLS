# BlackForge Discord Bot

Discord bot for BlackForge WURM Tools - get timer notifications, price lookups, crafting recipes, and more directly in Discord!

## Features

- **Timers** - Create and manage WURM timers with Discord notifications
- **Price Lookups** - Check item prices from the market database
- **Crafting Recipes** - Look up how to craft items
- **Market Orders** - Search active buy/sell orders
- **Events** - View upcoming community events
- **Leaderboard** - See the XP leaderboard

## Commands

| Command | Description |
|---------|-------------|
| `/timer start <type> <minutes>` | Start a new timer |
| `/timer list` | List your active timers |
| `/timer cancel <id>` | Cancel a timer |
| `/price <item>` | Look up item prices |
| `/craft <item>` | Look up crafting recipe |
| `/market <item>` | Search market orders |
| `/events` | Show upcoming events |
| `/leaderboard` | Show XP leaderboard |
| `/link <code>` | Link your Discord account |
| `/unlink` | Unlink your Discord account |
| `/status` | Check account status |
| `/blackforge` | Bot help and info |

## Setup

### 1. Create Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to "Bot" section and click "Add Bot"
4. Copy the **Bot Token** (you'll need this)
5. Go to "OAuth2" → "General" and copy the **Client ID**
6. Enable these Privileged Gateway Intents:
   - None required for basic functionality

### 2. Invite Bot to Server

1. Go to "OAuth2" → "URL Generator"
2. Select scopes: `bot`, `applications.commands`
3. Select bot permissions: `Send Messages`, `Embed Links`, `Use Slash Commands`
4. Copy the generated URL and open it to invite the bot

### 3. Configure Environment

Create a `.env` file in the `bot/` directory:

```env
# Discord Bot Configuration
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_GUILD_ID=your_guild_id_here  # Optional: for faster command updates during dev

# Database (same as main app)
DATABASE_URL=mysql://user:password@localhost:3306/wurmtools

# App URL for links
APP_URL=https://your-domain.com
```

### 4. Run Database Migration

```bash
mysql -u root -p wurmtools < scripts/migrations/add-discord-id.sql
```

### 5. Install Dependencies

```bash
cd bot
npm install
```

### 6. Build and Run

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## Running with PM2

For production, use PM2 to manage the bot process:

```bash
# Start the bot
pm2 start dist/index.js --name blackforge-bot

# View logs
pm2 logs blackforge-bot

# Restart
pm2 restart blackforge-bot

# Stop
pm2 stop blackforge-bot
```

Add to existing `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    // ... existing web app config
    {
      name: 'blackforge-bot',
      cwd: './bot',
      script: 'dist/index.js',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
```

## Linking Discord Account

For timer notifications via DM and personalized commands, users need to link their Discord account:

### Via Web + Discord Bot (Recommended)
1. User logs into BlackForge website
2. Goes to Dashboard → Settings → Discord
3. Clicks "Generate Link Code" to get an 8-character verification code
4. Uses `/link <code>` command in Discord to complete the link

### API Endpoint
The web app provides `/api/discord/link` endpoint:
- `GET` - Check link status and get pending code
- `POST { action: 'generate' }` - Generate a new verification code
- `POST { action: 'unlink' }` - Unlink Discord account

### Manual (Admin)
```sql
UPDATE users SET discord_id = '123456789' WHERE id = 1;
```

## Timer Notifications

The bot automatically sends notifications when timers are about to expire:

- Checks every 30 seconds for expiring timers
- Sends notification 1 minute before timer ends
- Supports DM notifications (if Discord account linked)
- Falls back to webhook notifications (if configured)

To enable webhook timer notifications, users must enable `notify_timers` in their webhook settings.

## Development

### Project Structure

```
bot/
├── src/
│   ├── index.ts              # Main entry point
│   ├── config.ts             # Configuration
│   ├── database.ts           # Database queries
│   ├── commands/
│   │   └── index.ts          # Slash commands
│   └── services/
│       └── timer-notifications.ts  # Timer notification service
├── package.json
├── tsconfig.json
└── README.md
```

### Adding New Commands

1. Add command definition to `commands` array in `src/commands/index.ts`
2. Add handler function to `commandHandlers` object
3. Rebuild and restart the bot

### Testing Commands

During development, set `DISCORD_GUILD_ID` to your test server for instant command updates. Global commands can take up to an hour to propagate.

## Troubleshooting

### Commands not showing up

- Guild commands: Check the Guild ID is correct
- Global commands: Wait up to 1 hour for propagation
- Check bot has `applications.commands` scope

### Bot not responding

- Check the bot token is correct
- Check the bot has proper permissions in the channel
- Check console/logs for errors

### Database errors

- Verify DATABASE_URL is correct
- Run the migration script
- Check MySQL/MariaDB is running
