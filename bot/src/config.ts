import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env from bot directory or parent directory
config({ path: resolve(__dirname, '../.env') });
config({ path: resolve(__dirname, '../../.env') });

export const BOT_CONFIG = {
  // Discord
  token: process.env.DISCORD_BOT_TOKEN || '',
  clientId: process.env.DISCORD_CLIENT_ID || '',
  guildId: process.env.DISCORD_GUILD_ID || '', // Optional: for guild-specific commands

  // Database (same as main app)
  databaseUrl: process.env.DATABASE_URL || '',

  // App URL for links
  appUrl: process.env.APP_URL || 'https://blackforge.tools',

  // Embed colors
  colors: {
    primary: 0x5865F2,    // Discord blurple
    success: 0x57F287,    // Green
    warning: 0xFEE75C,    // Yellow
    error: 0xED4245,      // Red
    info: 0x5865F2,       // Blue
    timer: {
      sleep_bonus: 0x22C55E,   // Green
      fatigue: 0x3B82F6,       // Blue
      crop: 0xEAB308,          // Yellow
      animal: 0xA855F7,        // Purple
      sermon: 0xEF4444,        // Red
      meditation: 0x6366F1,    // Indigo
      cooldown: 0x14B8A6,      // Teal
      bulk: 0xF97316,          // Orange
      custom: 0x6B7280,        // Gray
    } as Record<string, number>,
  },

  // Timer type icons
  timerIcons: {
    sleep_bonus: '⌛',
    fatigue: '🔋',
    crop: '🌾',
    animal: '🐴',
    sermon: '📖',
    meditation: '🧘',
    cooldown: '⏱️',
    bulk: '📦',
    custom: '⚙️',
  } as Record<string, string>,
};

export function validateConfig(): boolean {
  const errors: string[] = [];

  if (!BOT_CONFIG.token) {
    errors.push('DISCORD_BOT_TOKEN is required');
  }
  if (!BOT_CONFIG.clientId) {
    errors.push('DISCORD_CLIENT_ID is required');
  }
  if (!BOT_CONFIG.databaseUrl) {
    errors.push('DATABASE_URL is required');
  }

  if (errors.length > 0) {
    console.error('Configuration errors:');
    errors.forEach(e => console.error(`  - ${e}`));
    return false;
  }

  return true;
}
