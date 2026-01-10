import { Client, EmbedBuilder, TextChannel } from 'discord.js';
import { BOT_CONFIG } from '../config';
import { query, execute } from '../database';
import { RowDataPacket } from 'mysql2';

interface ExpiringTimer extends RowDataPacket {
  id: number;
  user_id: number;
  name: string;
  timer_type: string;
  end_time: Date;
  is_recurring: boolean;
  duration_minutes: number;
  discord_id: string | null;
  webhook_url: string | null;
}

/**
 * Timer notification service
 * Checks for expiring timers and sends Discord notifications
 */
export class TimerNotificationService {
  private client: Client;
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL_MS = 30000; // 30 seconds
  private readonly NOTIFICATION_WINDOW_MS = 60000; // 1 minute before expiry

  constructor(client: Client) {
    this.client = client;
  }

  /**
   * Start the timer notification service
   */
  start(): void {
    console.log('Starting timer notification service...');
    this.checkInterval = setInterval(() => this.checkTimers(), this.CHECK_INTERVAL_MS);
    // Run immediately on start
    this.checkTimers();
  }

  /**
   * Stop the timer notification service
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    console.log('Timer notification service stopped');
  }

  /**
   * Check for expiring timers and send notifications
   */
  private async checkTimers(): Promise<void> {
    try {
      // Find timers expiring within the notification window
      // that haven't been notified yet
      const expiringTimers = await query<ExpiringTimer>(`
        SELECT
          t.id, t.user_id, t.name, t.timer_type, t.end_time,
          t.is_recurring, t.duration_minutes,
          u.discord_id,
          (SELECT webhook_url FROM discord_webhooks
           WHERE user_id = t.user_id AND is_active = true AND notify_timers = true
           LIMIT 1) as webhook_url
        FROM user_timers t
        JOIN users u ON t.user_id = u.id
        WHERE t.is_active = true
          AND t.notify_discord = true
          AND t.end_time <= DATE_ADD(NOW(), INTERVAL 1 MINUTE)
          AND t.end_time > NOW()
          AND t.notified_at IS NULL
      `);

      for (const timer of expiringTimers) {
        await this.sendTimerNotification(timer);
        await this.markTimerNotified(timer.id);
      }

      // Also check for timers that just expired (for restart if recurring)
      await this.handleExpiredTimers();

    } catch (error) {
      console.error('Error checking timers:', error);
    }
  }

  // Discord ID format validation (17-19 digits)
  private static readonly DISCORD_ID_REGEX = /^\d{17,19}$/;

  // Webhook URL validation
  private isValidWebhookUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      const validHosts = ['discord.com', 'discordapp.com'];
      return validHosts.includes(parsed.hostname.toLowerCase()) &&
             parsed.protocol === 'https:' &&
             parsed.pathname.startsWith('/api/webhooks/') &&
             !parsed.username && !parsed.password;
    } catch {
      return false;
    }
  }

  /**
   * Send notification for an expiring timer
   */
  private async sendTimerNotification(timer: ExpiringTimer): Promise<void> {
    const icon = BOT_CONFIG.timerIcons[timer.timer_type] || '⏰';
    const endTimestamp = Math.floor(new Date(timer.end_time).getTime() / 1000);

    const embed = new EmbedBuilder()
      .setTitle(`${icon} Timer Expiring!`)
      .setDescription(`**${timer.name}** is about to end!`)
      .addFields(
        { name: 'Ends', value: `<t:${endTimestamp}:R>`, inline: true },
        { name: 'Type', value: timer.timer_type.replace('_', ' '), inline: true }
      )
      .setColor(BOT_CONFIG.colors.warning)
      .setFooter({ text: 'BlackForge Timer Notification' })
      .setTimestamp();

    // Try to send via DM if user has Discord linked (with validation)
    if (timer.discord_id && TimerNotificationService.DISCORD_ID_REGEX.test(timer.discord_id)) {
      try {
        const user = await this.client.users.fetch(timer.discord_id);
        await user.send({ embeds: [embed] });
        // Sanitized log - no user IDs
        console.log('Sent timer notification via DM');
        return;
      } catch {
        // Sanitized log - no sensitive data
        console.warn('Could not send DM notification');
      }
    }

    // Fall back to webhook if available (with validation and timeout)
    if (timer.webhook_url && this.isValidWebhookUrl(timer.webhook_url)) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const response = await fetch(timer.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            embeds: [embed.toJSON()],
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          console.log('Sent timer notification via webhook');
        } else {
          console.warn(`Webhook notification failed with status ${response.status}`);
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.warn('Webhook notification timed out');
        } else {
          console.error('Failed to send webhook notification');
        }
      }
    }
  }

  /**
   * Mark a timer as notified
   */
  private async markTimerNotified(timerId: number): Promise<void> {
    await execute(
      'UPDATE user_timers SET notified_at = NOW() WHERE id = ?',
      [timerId]
    );
  }

  /**
   * Handle expired timers (deactivate or restart if recurring)
   */
  private async handleExpiredTimers(): Promise<void> {
    // Deactivate non-recurring expired timers
    await execute(`
      UPDATE user_timers
      SET is_active = false
      WHERE is_active = true
        AND end_time < NOW()
        AND is_recurring = false
    `);

    // Restart recurring timers
    await execute(`
      UPDATE user_timers
      SET
        start_time = NOW(),
        end_time = DATE_ADD(NOW(), INTERVAL duration_minutes MINUTE),
        notified_at = NULL
      WHERE is_active = true
        AND end_time < NOW()
        AND is_recurring = true
    `);
  }
}
