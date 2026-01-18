import { Client, GatewayIntentBits, Events, Collection, REST, Routes } from 'discord.js';
import { BOT_CONFIG, validateConfig } from './config';
import { closePool } from './database';
import { commands, commandHandlers } from './commands';
import { TimerNotificationService } from './services/timer-notifications';

// Extend Client to include commands
declare module 'discord.js' {
  interface Client {
    commands: Collection<string, typeof commandHandlers[keyof typeof commandHandlers]>;
  }
}

async function main() {
  // Validate configuration
  if (!validateConfig()) {
    process.exit(1);
  }

  // Create Discord client
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
    ],
  });

  // Store commands on client
  client.commands = new Collection();
  for (const [name, handler] of Object.entries(commandHandlers)) {
    client.commands.set(name, handler);
  }

  // Register slash commands
  const rest = new REST().setToken(BOT_CONFIG.token);

  try {
    if (BOT_CONFIG.guildId) {
      // Guild-specific commands (instant update, good for development)
      await rest.put(
        Routes.applicationGuildCommands(BOT_CONFIG.clientId, BOT_CONFIG.guildId),
        { body: commands }
      );
    } else {
      // Global commands (can take up to an hour to propagate)
      await rest.put(
        Routes.applicationCommands(BOT_CONFIG.clientId),
        { body: commands }
      );
    }
  } catch (error) {
    console.error('Error registering commands:', error);
  }

  // Initialize timer notification service
  const timerService = new TimerNotificationService(client);

  // Handle ready event
  client.once(Events.ClientReady, () => {
    // Start timer notifications
    timerService.start();
  });

  // Handle interactions
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) {
      return;
    }

    try {
      await command(interaction);
    } catch (error) {
      // Sanitized error logging - don't log full error details that may contain user data
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Command error (${interaction.commandName}): ${errorMsg}`);

      const errorMessage = {
        content: 'There was an error executing this command.',
        ephemeral: true,
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage);
      } else {
        await interaction.reply(errorMessage);
      }
    }
  });

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    timerService.stop();
    await closePool();
    client.destroy();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    timerService.stop();
    await closePool();
    client.destroy();
    process.exit(0);
  });

  // Login to Discord
  await client.login(BOT_CONFIG.token);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
