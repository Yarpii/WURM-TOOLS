import { query } from "./core";
import type {
  DiscordWebhook,
  CreateWebhookInput,
} from "../types";

// ========== WEBHOOKS ==========

export async function getUserWebhooks(userId: number): Promise<DiscordWebhook[]> {
  const result = await query<DiscordWebhook>(
    "SELECT * FROM discord_webhooks WHERE user_id = ? ORDER BY created_at DESC",
    [userId]
  );
  return result.rows;
}

export async function getWebhookById(webhookId: number): Promise<DiscordWebhook | null> {
  const result = await query<DiscordWebhook>(
    "SELECT * FROM discord_webhooks WHERE id = ?",
    [webhookId]
  );
  return result.rows[0] || null;
}

export async function createWebhook(userId: number, input: CreateWebhookInput): Promise<number> {
  await query(
    `INSERT INTO discord_webhooks (user_id, name, webhook_url, notify_trades, notify_matches, notify_price_alerts, notify_alliance)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      input.name,
      input.webhook_url,
      input.notify_trades ? 1 : 0,
      input.notify_matches ? 1 : 0,
      input.notify_price_alerts ? 1 : 0,
      input.notify_alliance ? 1 : 0,
    ]
  );
  const idResult = await query<{ id: number }>("SELECT LAST_INSERT_ID() as id");
  return idResult.rows[0]?.id || 0;
}

export async function deleteWebhook(webhookId: number, userId: number): Promise<boolean> {
  const result = await query(
    "DELETE FROM discord_webhooks WHERE id = ? AND user_id = ?",
    [webhookId, userId]
  );
  return result.rowCount > 0;
}

export async function updateWebhook(
  webhookId: number,
  userId: number,
  updates: Partial<CreateWebhookInput>
): Promise<boolean> {
  const webhook = await getWebhookById(webhookId);
  if (!webhook || webhook.user_id !== userId) return false;

  const fields: string[] = [];
  const values: (string | number)[] = [];

  if (updates.name !== undefined) {
    fields.push("name = ?");
    values.push(updates.name);
  }
  if (updates.webhook_url !== undefined) {
    fields.push("webhook_url = ?");
    values.push(updates.webhook_url);
  }
  if (updates.notify_trades !== undefined) {
    fields.push("notify_trades = ?");
    values.push(updates.notify_trades ? 1 : 0);
  }
  if (updates.notify_matches !== undefined) {
    fields.push("notify_matches = ?");
    values.push(updates.notify_matches ? 1 : 0);
  }
  if (updates.notify_price_alerts !== undefined) {
    fields.push("notify_price_alerts = ?");
    values.push(updates.notify_price_alerts ? 1 : 0);
  }
  if (updates.notify_alliance !== undefined) {
    fields.push("notify_alliance = ?");
    values.push(updates.notify_alliance ? 1 : 0);
  }

  if (fields.length === 0) return false;

  values.push(webhookId);
  const result = await query(`UPDATE discord_webhooks SET ${fields.join(", ")} WHERE id = ?`, values);
  return result.rowCount > 0;
}
