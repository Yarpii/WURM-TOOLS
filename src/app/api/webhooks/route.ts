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
      const webhook = await getWebhookById(parseInt(webhookId));
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

        // Validate webhook URL format
        if (!webhook_url.startsWith("https://discord.com/api/webhooks/") &&
            !webhook_url.startsWith("https://discordapp.com/api/webhooks/")) {
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
        if (data.webhook_url !== undefined) updates.webhook_url = data.webhook_url.trim();
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

        // Send test notification
        try {
          await fetch(webhook.webhook_url, {
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
          });

          return NextResponse.json({ success: true, message: "Test notification sent!" });
        } catch (error) {
          return NextResponse.json(
            { error: "Failed to send test notification" },
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
