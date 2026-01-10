import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getUserWebhooks,
  getWebhookById,
  createWebhook,
  updateWebhook,
  deleteWebhook,
} from "@/lib/database";
import { sanitizeError } from "@/lib/security";
import type { CreateWebhookInput } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get("session")?.value;
    if (!sessionId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const result = await getSession(sessionId);
    if (!result) {
      return NextResponse.json(
        { error: "Invalid session" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const webhookId = searchParams.get("id");

    if (webhookId) {
      const parsedId = parseInt(webhookId);
      if (isNaN(parsedId) || parsedId < 1) {
        return NextResponse.json(
          { error: "Invalid webhook ID" },
          { status: 400 }
        );
      }
      const webhook = await getWebhookById(parsedId);
      if (!webhook || webhook.user_id !== result.user.id) {
        return NextResponse.json(
          { error: "Webhook not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(webhook);
    }

    const webhooks = await getUserWebhooks(result.user.id);
    return NextResponse.json(webhooks);
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Fetch webhooks") },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionId = request.cookies.get("session")?.value;
    if (!sessionId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const result = await getSession(sessionId);
    if (!result) {
      return NextResponse.json(
        { error: "Invalid session" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, webhook_id, ...data } = body;

    switch (action) {
      case "create": {
        const { name, webhook_url, notify_trades, notify_matches, notify_price_alerts, notify_alliance } = data;

        if (!name || !webhook_url) {
          return NextResponse.json(
            { error: "Name and webhook URL are required" },
            { status: 400 }
          );
        }

        // Validate webhook URL format (SSRF-safe validation)
        try {
          const parsedUrl = new URL(webhook_url);
          const validHosts = ['discord.com', 'discordapp.com'];
          if (!validHosts.includes(parsedUrl.hostname.toLowerCase())) {
            throw new Error('Invalid host');
          }
          if (parsedUrl.protocol !== 'https:') {
            throw new Error('Must use HTTPS');
          }
          if (!parsedUrl.pathname.startsWith('/api/webhooks/')) {
            throw new Error('Invalid path');
          }
          // Ensure no auth credentials in URL
          if (parsedUrl.username || parsedUrl.password) {
            throw new Error('URL cannot contain credentials');
          }
        } catch {
          return NextResponse.json(
            { error: "Invalid Discord webhook URL" },
            { status: 400 }
          );
        }

        const input: CreateWebhookInput = {
          name: name.trim(),
          webhook_url: webhook_url.trim(),
          notify_trades: notify_trades !== false,
          notify_matches: notify_matches !== false,
          notify_price_alerts: notify_price_alerts !== false,
          notify_alliance: notify_alliance || false,
        };

        const id = await createWebhook(result.user.id, input);
        return NextResponse.json({ id, success: true });
      }

      case "update": {
        if (!webhook_id) {
          return NextResponse.json(
            { error: "Webhook ID is required" },
            { status: 400 }
          );
        }

        const updates: Partial<CreateWebhookInput> & { is_active?: boolean } = {};
        if (data.name !== undefined) updates.name = data.name.trim();
        if (data.webhook_url !== undefined) {
          // Validate webhook URL on update (SSRF-safe)
          try {
            const parsedUrl = new URL(data.webhook_url);
            const validHosts = ['discord.com', 'discordapp.com'];
            if (!validHosts.includes(parsedUrl.hostname.toLowerCase()) ||
                parsedUrl.protocol !== 'https:' ||
                !parsedUrl.pathname.startsWith('/api/webhooks/') ||
                parsedUrl.username || parsedUrl.password) {
              throw new Error('Invalid webhook URL');
            }
            updates.webhook_url = data.webhook_url.trim();
          } catch {
            return NextResponse.json(
              { error: "Invalid Discord webhook URL" },
              { status: 400 }
            );
          }
        }
        if (data.is_active !== undefined) updates.is_active = data.is_active;
        if (data.notify_trades !== undefined) updates.notify_trades = data.notify_trades;
        if (data.notify_matches !== undefined) updates.notify_matches = data.notify_matches;
        if (data.notify_price_alerts !== undefined) updates.notify_price_alerts = data.notify_price_alerts;
        if (data.notify_alliance !== undefined) updates.notify_alliance = data.notify_alliance;

        const updated = await updateWebhook(webhook_id, result.user.id, updates);
        return NextResponse.json({ success: updated });
      }

      case "delete": {
        if (!webhook_id) {
          return NextResponse.json(
            { error: "Webhook ID is required" },
            { status: 400 }
          );
        }

        const deleted = await deleteWebhook(webhook_id, result.user.id);
        return NextResponse.json({ success: deleted });
      }

      case "test": {
        if (!webhook_id) {
          return NextResponse.json(
            { error: "Webhook ID is required" },
            { status: 400 }
          );
        }

        const webhook = await getWebhookById(webhook_id);
        if (!webhook || webhook.user_id !== result.user.id) {
          return NextResponse.json(
            { error: "Webhook not found" },
            { status: 404 }
          );
        }

        // Send test notification with timeout
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

          const response = await fetch(webhook.webhook_url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              embeds: [{
                title: "Blackforge Test Notification",
                description: "Your webhook is configured correctly!",
                color: 0x5865F2, // Discord blurple
                footer: { text: "Blackforge - Wurm Online Companion" },
                timestamp: new Date().toISOString(),
              }],
            }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            return NextResponse.json(
              { error: `Discord returned error: ${response.status}` },
              { status: 400 }
            );
          }

          return NextResponse.json({ success: true, message: "Test notification sent!" });
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") {
            return NextResponse.json(
              { error: "Webhook request timed out - URL may be unreachable" },
              { status: 408 }
            );
          }
          return NextResponse.json(
            { error: "Failed to send test notification - check webhook URL" },
            { status: 500 }
          );
        }
      }

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError(error, "Process webhook request") },
      { status: 500 }
    );
  }
}
