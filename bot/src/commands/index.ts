import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import { BOT_CONFIG } from '../config';
import * as db from '../database';

// ==================== COMMAND DEFINITIONS ====================

export const commands = [
  // Timer commands
  new SlashCommandBuilder()
    .setName('timer')
    .setDescription('Manage your WURM timers')
    .addSubcommand(sub =>
      sub
        .setName('start')
        .setDescription('Start a new timer')
        .addStringOption(opt =>
          opt
            .setName('type')
            .setDescription('Timer type')
            .setRequired(true)
            .addChoices(
              { name: '⌛ Sleep Bonus', value: 'sleep_bonus' },
              { name: '🔋 Fatigue', value: 'fatigue' },
              { name: '🌾 Crop', value: 'crop' },
              { name: '🐴 Animal', value: 'animal' },
              { name: '📖 Sermon', value: 'sermon' },
              { name: '🧘 Meditation', value: 'meditation' },
              { name: '⏱️ Cooldown', value: 'cooldown' },
              { name: '📦 Bulk', value: 'bulk' },
              { name: '⚙️ Custom', value: 'custom' }
            )
        )
        .addIntegerOption(opt =>
          opt
            .setName('minutes')
            .setDescription('Duration in minutes')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(10080) // 1 week max
        )
        .addStringOption(opt =>
          opt
            .setName('name')
            .setDescription('Timer name (optional)')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('list')
        .setDescription('List your active timers')
    )
    .addSubcommand(sub =>
      sub
        .setName('cancel')
        .setDescription('Cancel a timer')
        .addIntegerOption(opt =>
          opt
            .setName('id')
            .setDescription('Timer ID to cancel')
            .setRequired(true)
        )
    )
    .toJSON(),

  // Price commands
  new SlashCommandBuilder()
    .setName('price')
    .setDescription('Look up item prices')
    .addStringOption(opt =>
      opt
        .setName('item')
        .setDescription('Item name to search')
        .setRequired(true)
    )
    .toJSON(),

  // Craft commands
  new SlashCommandBuilder()
    .setName('craft')
    .setDescription('Look up crafting recipes')
    .addStringOption(opt =>
      opt
        .setName('item')
        .setDescription('Item name to search')
        .setRequired(true)
    )
    .toJSON(),

  // Market commands
  new SlashCommandBuilder()
    .setName('market')
    .setDescription('Search market orders')
    .addStringOption(opt =>
      opt
        .setName('item')
        .setDescription('Item name to search')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt
        .setName('type')
        .setDescription('Order type')
        .setRequired(false)
        .addChoices(
          { name: 'Buy Orders', value: 'buy' },
          { name: 'Sell Orders', value: 'sell' }
        )
    )
    .toJSON(),

  // Events command
  new SlashCommandBuilder()
    .setName('events')
    .setDescription('Show upcoming WURM events')
    .addIntegerOption(opt =>
      opt
        .setName('limit')
        .setDescription('Number of events to show (default: 5)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(10)
    )
    .toJSON(),

  // Leaderboard command
  new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show the XP leaderboard')
    .addIntegerOption(opt =>
      opt
        .setName('limit')
        .setDescription('Number of players to show (default: 10)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(25)
    )
    .toJSON(),

  // Help command
  new SlashCommandBuilder()
    .setName('blackforge')
    .setDescription('BlackForge bot information and help')
    .toJSON(),

  // Link account command
  new SlashCommandBuilder()
    .setName('link')
    .setDescription('Link your Discord account to BlackForge')
    .addStringOption(opt =>
      opt
        .setName('code')
        .setDescription('Verification code from the website')
        .setRequired(true)
    )
    .toJSON(),

  // Unlink account command
  new SlashCommandBuilder()
    .setName('unlink')
    .setDescription('Unlink your Discord account from BlackForge')
    .toJSON(),

  // Account status command
  new SlashCommandBuilder()
    .setName('status')
    .setDescription('Check your linked BlackForge account status')
    .toJSON(),
];

// ==================== COMMAND HANDLERS ====================

export const commandHandlers = {
  // Timer command handler
  async timer(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();
    const user = await db.getUserByDiscordId(interaction.user.id);

    if (!user) {
      return interaction.reply({
        content: `You need to link your Discord account first. Visit ${BOT_CONFIG.appUrl}/dashboard to connect your account.`,
        ephemeral: true,
      });
    }

    switch (subcommand) {
      case 'start': {
        const timerType = interaction.options.getString('type', true);
        const minutes = interaction.options.getInteger('minutes', true);
        const customName = interaction.options.getString('name');

        const icon = BOT_CONFIG.timerIcons[timerType] || '⏰';
        const name = customName || `${icon} ${timerType.replace('_', ' ')}`;

        const timerId = await db.createTimer(user.id, name, timerType, minutes, {
          notifyDiscord: true,
        });

        const endTime = new Date(Date.now() + minutes * 60 * 1000);
        const timestamp = Math.floor(endTime.getTime() / 1000);

        const embed = new EmbedBuilder()
          .setTitle(`${icon} Timer Started`)
          .setDescription(`**${name}**`)
          .addFields(
            { name: 'Duration', value: formatDuration(minutes), inline: true },
            { name: 'Ends', value: `<t:${timestamp}:R>`, inline: true },
            { name: 'Timer ID', value: `#${timerId}`, inline: true }
          )
          .setColor(BOT_CONFIG.colors.timer[timerType] || BOT_CONFIG.colors.primary)
          .setFooter({ text: 'BlackForge Timer' })
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      }

      case 'list': {
        const timers = await db.getUserTimers(user.id);

        if (timers.length === 0) {
          return interaction.reply({
            content: 'You have no active timers.',
            ephemeral: true,
          });
        }

        const embed = new EmbedBuilder()
          .setTitle('⏰ Your Active Timers')
          .setColor(BOT_CONFIG.colors.primary)
          .setFooter({ text: `${timers.length} active timer${timers.length !== 1 ? 's' : ''}` })
          .setTimestamp();

        for (const timer of timers.slice(0, 10)) {
          const endTime = new Date(timer.end_time);
          const timestamp = Math.floor(endTime.getTime() / 1000);
          const icon = BOT_CONFIG.timerIcons[timer.timer_type] || '⏰';

          embed.addFields({
            name: `${icon} ${timer.name} (#${timer.id})`,
            value: `Ends <t:${timestamp}:R> • ${formatDuration(timer.duration_minutes)}`,
            inline: false,
          });
        }

        if (timers.length > 10) {
          embed.addFields({
            name: '\u200b',
            value: `... and ${timers.length - 10} more. View all at ${BOT_CONFIG.appUrl}/timers`,
          });
        }

        return interaction.reply({ embeds: [embed] });
      }

      case 'cancel': {
        const timerId = interaction.options.getInteger('id', true);
        const success = await db.cancelTimer(timerId, user.id);

        if (success) {
          return interaction.reply({
            content: `Timer #${timerId} has been cancelled.`,
            ephemeral: true,
          });
        } else {
          return interaction.reply({
            content: `Timer #${timerId} not found or already cancelled.`,
            ephemeral: true,
          });
        }
      }
    }
  },

  // Price command handler
  async price(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const itemName = interaction.options.getString('item', true);
    const priceInfo = await db.getItemPrice(itemName);

    if (!priceInfo) {
      // Try to find similar items
      const similar = await db.searchPrices(itemName, 5);

      if (similar.length > 0) {
        const suggestions = similar.map(p => `• ${p.item_name}`).join('\n');
        return interaction.editReply({
          content: `No price data found for "${itemName}". Did you mean:\n${suggestions}`,
        });
      }

      return interaction.editReply({
        content: `No price data found for "${itemName}".`,
      });
    }

    const embed = new EmbedBuilder()
      .setTitle(`💰 Price: ${priceInfo.item_name}`)
      .setColor(BOT_CONFIG.colors.success)
      .addFields(
        { name: 'Average', value: formatPrice(priceInfo.avg_price), inline: true },
        { name: 'Min', value: formatPrice(priceInfo.min_price), inline: true },
        { name: 'Max', value: formatPrice(priceInfo.max_price), inline: true },
        { name: 'Data Points', value: priceInfo.total_orders.toString(), inline: true },
        { name: 'Latest', value: priceInfo.latest_price ? formatPrice(priceInfo.latest_price) : 'N/A', inline: true }
      )
      .setFooter({ text: 'BlackForge Price Guide' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  },

  // Craft command handler
  async craft(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const itemName = interaction.options.getString('item', true);
    const item = await db.getItemByName(itemName);

    if (!item) {
      // Try to find similar items
      const similar = await db.searchItems(itemName, 5);

      if (similar.length > 0) {
        const suggestions = similar.map(i => `• ${i.name} (${i.category})`).join('\n');
        return interaction.editReply({
          content: `No item found for "${itemName}". Did you mean:\n${suggestions}`,
        });
      }

      return interaction.editReply({
        content: `No item found for "${itemName}".`,
      });
    }

    const recipe = await db.getRecipe(item.id);

    const embed = new EmbedBuilder()
      .setTitle(`🔨 ${item.name}`)
      .setColor(BOT_CONFIG.colors.info)
      .setFooter({ text: 'BlackForge Crafting Guide' })
      .setTimestamp();

    if (item.description) {
      embed.setDescription(item.description);
    }

    embed.addFields(
      { name: 'Category', value: item.category, inline: true }
    );

    if (item.difficulty) {
      embed.addFields({ name: 'Difficulty', value: item.difficulty.toString(), inline: true });
    }

    if (item.skill_type) {
      embed.addFields({ name: 'Skill', value: item.skill_type.replace('_', ' '), inline: true });
    }

    if (recipe.length > 0) {
      const ingredients = recipe
        .map(r => `• ${r.quantity}x ${r.ingredient_name}`)
        .join('\n');

      embed.addFields({
        name: 'Recipe',
        value: ingredients.substring(0, 1024),
        inline: false,
      });
    } else if (item.is_base_material) {
      embed.addFields({
        name: 'Type',
        value: 'Base material (no recipe)',
        inline: false,
      });
    } else {
      embed.addFields({
        name: 'Recipe',
        value: 'Recipe not yet documented',
        inline: false,
      });
    }

    embed.addFields({
      name: '\u200b',
      value: `[View full details](${BOT_CONFIG.appUrl}/crafting?item=${encodeURIComponent(item.name)})`,
    });

    return interaction.editReply({ embeds: [embed] });
  },

  // Market command handler
  async market(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const itemName = interaction.options.getString('item', true);
    const orderType = interaction.options.getString('type') as 'buy' | 'sell' | undefined;

    const orders = await db.getMarketOrders(itemName, orderType);

    if (orders.length === 0) {
      return interaction.editReply({
        content: `No active ${orderType || ''} orders found for "${itemName}".`,
      });
    }

    const embed = new EmbedBuilder()
      .setTitle(`📦 Market: ${itemName}`)
      .setColor(BOT_CONFIG.colors.primary)
      .setFooter({ text: `Found ${orders.length} order${orders.length !== 1 ? 's' : ''}` })
      .setTimestamp();

    for (const order of orders.slice(0, 8)) {
      const typeEmoji = order.order_type === 'buy' ? '🟢' : '🔴';
      const priceStr = order.price ? formatPrice(order.price) : 'Negotiable';
      const qualityStr = order.quality ? `QL ${order.quality}` : '';

      embed.addFields({
        name: `${typeEmoji} ${order.order_type.toUpperCase()} - ${order.username}`,
        value: [
          `**${order.quantity}x** ${order.item_name} ${qualityStr}`,
          `Price: ${priceStr}`,
          order.location ? `Location: ${order.location}` : null,
        ].filter(Boolean).join('\n'),
        inline: true,
      });
    }

    if (orders.length > 8) {
      embed.addFields({
        name: '\u200b',
        value: `[View all ${orders.length} orders](${BOT_CONFIG.appUrl}/market?search=${encodeURIComponent(itemName)})`,
      });
    }

    return interaction.editReply({ embeds: [embed] });
  },

  // Events command handler
  async events(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const limit = interaction.options.getInteger('limit') || 5;
    const events = await db.getUpcomingEvents(limit);

    if (events.length === 0) {
      return interaction.editReply({
        content: 'No upcoming events scheduled.',
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('📅 Upcoming Events')
      .setColor(BOT_CONFIG.colors.primary)
      .setFooter({ text: 'BlackForge Events' })
      .setTimestamp();

    for (const event of events) {
      const startTimestamp = Math.floor(new Date(event.start_date).getTime() / 1000);
      const typeEmoji = getEventEmoji(event.event_type);

      embed.addFields({
        name: `${typeEmoji} ${event.title}`,
        value: [
          `<t:${startTimestamp}:F>`,
          event.server ? `Server: ${event.server}` : null,
          event.location ? `Location: ${event.location}` : null,
          `Attendees: ${event.attendee_count || 0}`,
        ].filter(Boolean).join('\n'),
        inline: false,
      });
    }

    embed.addFields({
      name: '\u200b',
      value: `[View all events](${BOT_CONFIG.appUrl}/events)`,
    });

    return interaction.editReply({ embeds: [embed] });
  },

  // Leaderboard command handler
  async leaderboard(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const limit = interaction.options.getInteger('limit') || 10;
    const entries = await db.getLeaderboard(limit);

    if (entries.length === 0) {
      return interaction.editReply({
        content: 'No leaderboard data available.',
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('🏆 XP Leaderboard')
      .setColor(BOT_CONFIG.colors.warning)
      .setFooter({ text: 'BlackForge Leaderboard' })
      .setTimestamp();

    const leaderboardText = entries
      .map((entry, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
        return `${medal} **${entry.username}** - Level ${entry.level} (${entry.total_xp.toLocaleString()} XP)`;
      })
      .join('\n');

    embed.setDescription(leaderboardText);

    embed.addFields({
      name: '\u200b',
      value: `[View full leaderboard](${BOT_CONFIG.appUrl}/members)`,
    });

    return interaction.editReply({ embeds: [embed] });
  },

  // Help command handler
  async blackforge(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
      .setTitle('⚒️ BlackForge Bot')
      .setDescription('Your WURM Online companion bot')
      .setColor(BOT_CONFIG.colors.primary)
      .addFields(
        {
          name: '⏰ Timers',
          value: [
            '`/timer start` - Start a new timer',
            '`/timer list` - List active timers',
            '`/timer cancel` - Cancel a timer',
          ].join('\n'),
          inline: false,
        },
        {
          name: '💰 Market',
          value: [
            '`/price <item>` - Look up item prices',
            '`/market <item>` - Search market orders',
          ].join('\n'),
          inline: false,
        },
        {
          name: '🔨 Crafting',
          value: '`/craft <item>` - Look up crafting recipes',
          inline: false,
        },
        {
          name: '📅 Events',
          value: '`/events` - Show upcoming events',
          inline: false,
        },
        {
          name: '🏆 Community',
          value: '`/leaderboard` - Show XP leaderboard',
          inline: false,
        },
        {
          name: '🔐 Account',
          value: [
            '`/link <code>` - Link your Discord account',
            '`/unlink` - Unlink your Discord account',
            '`/status` - Check your account status',
          ].join('\n'),
          inline: false,
        },
        {
          name: '🔗 Links',
          value: `[Website](${BOT_CONFIG.appUrl}) • [Dashboard](${BOT_CONFIG.appUrl}/dashboard)`,
          inline: false,
        }
      )
      .setFooter({ text: 'BlackForge - WURM Online Companion' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  },

  // Link account command handler
  async link(interaction: ChatInputCommandInteraction) {
    const code = interaction.options.getString('code', true).trim().toUpperCase();

    // Check if already linked
    const existingUser = await db.getUserByDiscordId(interaction.user.id);
    if (existingUser) {
      return interaction.reply({
        content: `Your Discord account is already linked to **${existingUser.username}**. Use \`/unlink\` first if you want to link a different account.`,
        ephemeral: true,
      });
    }

    // Verify the code and link the account
    const result = await db.verifyAndLinkDiscord(code, interaction.user.id);

    if (!result.success) {
      return interaction.reply({
        content: result.error || 'Invalid or expired verification code. Please generate a new code from the website.',
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('Account Linked!')
      .setDescription(`Your Discord account has been successfully linked to **${result.username}**!`)
      .setColor(BOT_CONFIG.colors.success)
      .addFields(
        { name: 'What you can do now', value: [
          '• Use `/timer` commands to manage timers',
          '• Receive DM notifications when timers expire',
          '• Access personalized features',
        ].join('\n') }
      )
      .setFooter({ text: 'BlackForge' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
  },

  // Unlink account command handler
  async unlink(interaction: ChatInputCommandInteraction) {
    const user = await db.getUserByDiscordId(interaction.user.id);

    if (!user) {
      return interaction.reply({
        content: 'Your Discord account is not linked to any BlackForge account.',
        ephemeral: true,
      });
    }

    await db.unlinkDiscordAccount(interaction.user.id);

    return interaction.reply({
      content: `Your Discord account has been unlinked from **${user.username}**.`,
      ephemeral: true,
    });
  },

  // Status command handler
  async status(interaction: ChatInputCommandInteraction) {
    const user = await db.getUserByDiscordId(interaction.user.id);

    if (!user) {
      const embed = new EmbedBuilder()
        .setTitle('Account Status')
        .setDescription('Your Discord account is not linked to BlackForge.')
        .setColor(BOT_CONFIG.colors.warning)
        .addFields({
          name: 'How to link',
          value: `1. Go to [${BOT_CONFIG.appUrl}/dashboard](${BOT_CONFIG.appUrl}/dashboard)\n2. Click "Link Discord"\n3. Use \`/link <code>\` with the verification code`,
        })
        .setFooter({ text: 'BlackForge' })
        .setTimestamp();

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // Get user stats
    const stats = await db.getUserStats(user.id);

    const embed = new EmbedBuilder()
      .setTitle('Account Status')
      .setDescription(`Linked to **${user.username}**`)
      .setColor(BOT_CONFIG.colors.success)
      .addFields(
        { name: 'Active Timers', value: stats.activeTimers.toString(), inline: true },
        { name: 'Total Orders', value: stats.totalOrders.toString(), inline: true },
        { name: 'Events Attending', value: stats.eventsAttending.toString(), inline: true }
      )
      .setFooter({ text: 'BlackForge' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};

// ==================== HELPER FUNCTIONS ====================

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours < 24) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

function formatPrice(price: number): string {
  if (price >= 100) {
    const silver = Math.floor(price / 100);
    const copper = price % 100;
    return copper > 0 ? `${silver}s ${copper}c` : `${silver}s`;
  }
  return `${price}c`;
}

function getEventEmoji(eventType: string): string {
  const emojis: Record<string, string> = {
    impalong: '🔨',
    rift: '🌀',
    unique: '🐉',
    sermon_group: '📖',
    market: '🏪',
    pvp: '⚔️',
    community: '🎉',
    personal: '📌',
    other: '📅',
  };
  return emojis[eventType] || '📅';
}
