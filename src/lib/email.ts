import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

// Email configuration from environment
const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
};

const EMAIL_FROM = {
  name: process.env.EMAIL_FROM_NAME || "WURM Tools",
  address: process.env.EMAIL_FROM_ADDRESS || "noreply@wurm.tools",
};

// Feature flags
export const EMAIL_2FA_ENABLED = process.env.EMAIL_2FA_ENABLED === "true";
export const EMAIL_ALERTS_ENABLED = process.env.EMAIL_ALERTS_ENABLED === "true";
export const EMAIL_2FA_CODE_EXPIRY_MINUTES = parseInt(
  process.env.EMAIL_2FA_CODE_EXPIRY_MINUTES || "10"
);

// Create reusable transporter
let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport(SMTP_CONFIG);
  }
  return transporter;
}

// Check if email is configured
export function isEmailConfigured(): boolean {
  return !!(SMTP_CONFIG.auth.user && SMTP_CONFIG.auth.pass);
}

// Verify email configuration
export async function verifyEmailConfig(): Promise<boolean> {
  if (!isEmailConfigured()) {
    console.warn("Email not configured - SMTP credentials missing");
    return false;
  }

  try {
    await getTransporter().verify();
    return true;
  } catch (error) {
    console.error("Email configuration verification failed:", error);
    return false;
  }
}

// Base email sending function
interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  if (!isEmailConfigured()) {
    console.warn("Email not configured - skipping email send");
    return false;
  }

  try {
    await getTransporter().sendMail({
      from: `"${EMAIL_FROM.name}" <${EMAIL_FROM.address}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
}

// Generate a random 6-digit code
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Email templates
const emailStyles = `
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #fff; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: #f8f9fa; padding: 30px; border: 1px solid #e9ecef; }
    .code { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a1a2e; background: #fff; padding: 20px; text-align: center; border-radius: 8px; border: 2px dashed #dee2e6; margin: 20px 0; }
    .footer { background: #e9ecef; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; padding: 12px 24px; background: #0d6efd; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 500; }
    .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 6px; margin: 15px 0; }
  </style>
`;

// Send 2FA verification code
export async function send2FACode(
  email: string,
  code: string,
  username: string
): Promise<boolean> {
  const expiryMinutes = EMAIL_2FA_CODE_EXPIRY_MINUTES;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>${emailStyles}</head>
    <body>
      <div class="container">
        <div class="header">
          <h1>WURM Tools</h1>
        </div>
        <div class="content">
          <h2>Two-Factor Authentication</h2>
          <p>Hello <strong>${username}</strong>,</p>
          <p>Your verification code for logging into WURM Tools is:</p>
          <div class="code">${code}</div>
          <p>This code will expire in <strong>${expiryMinutes} minutes</strong>.</p>
          <div class="warning">
            <strong>Security Notice:</strong> If you did not attempt to log in, please ignore this email and consider changing your password.
          </div>
        </div>
        <div class="footer">
          <p>This is an automated message from WURM Tools. Please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
WURM Tools - Two-Factor Authentication

Hello ${username},

Your verification code is: ${code}

This code will expire in ${expiryMinutes} minutes.

If you did not attempt to log in, please ignore this email.
  `;

  return sendEmail({
    to: email,
    subject: `Your WURM Tools verification code: ${code}`,
    text,
    html,
  });
}

// Send email verification code (for adding/changing email)
export async function sendEmailVerificationCode(
  email: string,
  code: string,
  username: string
): Promise<boolean> {
  const expiryMinutes = EMAIL_2FA_CODE_EXPIRY_MINUTES;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>${emailStyles}</head>
    <body>
      <div class="container">
        <div class="header">
          <h1>WURM Tools</h1>
        </div>
        <div class="content">
          <h2>Verify Your Email Address</h2>
          <p>Hello <strong>${username}</strong>,</p>
          <p>Please use the following code to verify your email address:</p>
          <div class="code">${code}</div>
          <p>This code will expire in <strong>${expiryMinutes} minutes</strong>.</p>
          <div class="warning">
            <strong>Security Notice:</strong> If you did not request this verification, please ignore this email.
          </div>
        </div>
        <div class="footer">
          <p>This is an automated message from WURM Tools. Please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
WURM Tools - Email Verification

Hello ${username},

Your verification code is: ${code}

This code will expire in ${expiryMinutes} minutes.

If you did not request this verification, please ignore this email.
  `;

  return sendEmail({
    to: email,
    subject: `Verify your email for WURM Tools`,
    text,
    html,
  });
}

// Send welcome email after registration
export async function sendWelcomeEmail(
  email: string,
  username: string
): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://wurm.tools";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>${emailStyles}</head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to WURM Tools!</h1>
        </div>
        <div class="content">
          <h2>Hello ${username}!</h2>
          <p>Thank you for joining WURM Tools. Your account has been created successfully.</p>
          <p>With WURM Tools you can:</p>
          <ul>
            <li>Track your treasure hunts and loot</li>
            <li>Monitor your skill progression</li>
            <li>Connect with other Wurm Online players</li>
            <li>Use interactive maps with custom pins</li>
            <li>And much more!</li>
          </ul>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${appUrl}" class="button">Get Started</a>
          </p>
        </div>
        <div class="footer">
          <p>This is an automated message from WURM Tools. Please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Welcome to WURM Tools!

Hello ${username}!

Thank you for joining WURM Tools. Your account has been created successfully.

Visit ${appUrl} to get started.
  `;

  return sendEmail({
    to: email,
    subject: `Welcome to WURM Tools, ${username}!`,
    text,
    html,
  });
}

// Send password reset notification
export async function sendPasswordChangedEmail(
  email: string,
  username: string
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>${emailStyles}</head>
    <body>
      <div class="container">
        <div class="header">
          <h1>WURM Tools</h1>
        </div>
        <div class="content">
          <h2>Password Changed</h2>
          <p>Hello <strong>${username}</strong>,</p>
          <p>Your password has been successfully changed.</p>
          <div class="warning">
            <strong>Security Notice:</strong> If you did not make this change, please contact us immediately and secure your account.
          </div>
        </div>
        <div class="footer">
          <p>This is an automated message from WURM Tools. Please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
WURM Tools - Password Changed

Hello ${username},

Your password has been successfully changed.

If you did not make this change, please contact us immediately.
  `;

  return sendEmail({
    to: email,
    subject: `WURM Tools - Password Changed`,
    text,
    html,
  });
}

// Send alert notification (generic)
export interface AlertEmailOptions {
  email: string;
  username: string;
  alertType: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
}

export async function sendAlertEmail(options: AlertEmailOptions): Promise<boolean> {
  const { email, username, title, message, actionUrl, actionText } = options;

  const actionButton = actionUrl
    ? `<p style="text-align: center; margin: 30px 0;"><a href="${actionUrl}" class="button">${actionText || "View Details"}</a></p>`
    : "";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>${emailStyles}</head>
    <body>
      <div class="container">
        <div class="header">
          <h1>WURM Tools Alert</h1>
        </div>
        <div class="content">
          <h2>${title}</h2>
          <p>Hello <strong>${username}</strong>,</p>
          <p>${message}</p>
          ${actionButton}
        </div>
        <div class="footer">
          <p>You can manage your alert preferences in your account settings.</p>
          <p>This is an automated message from WURM Tools. Please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
WURM Tools Alert - ${title}

Hello ${username},

${message}

${actionUrl ? `View details: ${actionUrl}` : ""}

You can manage your alert preferences in your account settings.
  `;

  return sendEmail({
    to: email,
    subject: `WURM Tools: ${title}`,
    text,
    html,
  });
}

// Send password reset email
export async function sendPasswordResetEmail(
  email: string,
  username: string,
  resetUrl: string
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>${emailStyles}</head>
    <body>
      <div class="container">
        <div class="header">
          <h1>WURM Tools</h1>
        </div>
        <div class="content">
          <h2>Reset Your Password</h2>
          <p>Hello <strong>${username}</strong>,</p>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </p>
          <p style="font-size: 12px; color: #666;">Or copy this link: ${resetUrl}</p>
          <p>This link will expire in <strong>1 hour</strong>.</p>
          <div class="warning">
            <strong>Security Notice:</strong> If you did not request a password reset, please ignore this email. Your password will remain unchanged.
          </div>
        </div>
        <div class="footer">
          <p>This is an automated message from WURM Tools. Please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
WURM Tools - Reset Your Password

Hello ${username},

We received a request to reset your password. Visit the link below to create a new password:

${resetUrl}

This link will expire in 1 hour.

If you did not request a password reset, please ignore this email.
  `;

  return sendEmail({
    to: email,
    subject: `Reset your WURM Tools password`,
    text,
    html,
  });
}

// Send username reminder email
export async function sendUsernameReminderEmail(
  email: string,
  usernames: string[]
): Promise<boolean> {
  const usernameList = usernames.map(u => `• ${u}`).join("\n");
  const usernameListHtml = usernames.map(u => `<li><strong>${u}</strong></li>`).join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>${emailStyles}</head>
    <body>
      <div class="container">
        <div class="header">
          <h1>WURM Tools</h1>
        </div>
        <div class="content">
          <h2>Your Username Reminder</h2>
          <p>Hello,</p>
          <p>You requested a reminder of the username(s) associated with this email address:</p>
          <ul style="background: #fff; padding: 20px 40px; border-radius: 8px; border: 1px solid #dee2e6; margin: 20px 0;">
            ${usernameListHtml}
          </ul>
          <p>You can use any of these usernames to <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://wurm.tools"}/login">log in to your account</a>.</p>
          <div class="warning">
            <strong>Security Notice:</strong> If you did not request this reminder, someone may have entered your email address by mistake. No action is needed.
          </div>
        </div>
        <div class="footer">
          <p>This is an automated message from WURM Tools. Please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
WURM Tools - Your Username Reminder

Hello,

You requested a reminder of the username(s) associated with this email address:

${usernameList}

You can use any of these usernames to log in at ${process.env.NEXT_PUBLIC_APP_URL || "https://wurm.tools"}/login

If you did not request this reminder, someone may have entered your email address by mistake. No action is needed.
  `;

  return sendEmail({
    to: email,
    subject: `Your WURM Tools username reminder`,
    text,
    html,
  });
}

// Send new device login notification
export async function sendNewDeviceLoginEmail(
  email: string,
  username: string,
  deviceInfo: { ip?: string; browser?: string; os?: string; location?: string }
): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://wurm.tools";
  const time = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>${emailStyles}</head>
    <body>
      <div class="container">
        <div class="header">
          <h1>WURM Tools</h1>
        </div>
        <div class="content">
          <h2>New Login Detected</h2>
          <p>Hello <strong>${username}</strong>,</p>
          <p>We noticed a new login to your account:</p>
          <div style="background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #dee2e6; margin: 20px 0;">
            <table style="width: 100%; font-size: 14px;">
              <tr><td style="padding: 5px 0; color: #666;">Time:</td><td style="padding: 5px 0;"><strong>${time}</strong></td></tr>
              ${deviceInfo.browser ? `<tr><td style="padding: 5px 0; color: #666;">Browser:</td><td style="padding: 5px 0;"><strong>${deviceInfo.browser}</strong></td></tr>` : ""}
              ${deviceInfo.os ? `<tr><td style="padding: 5px 0; color: #666;">Operating System:</td><td style="padding: 5px 0;"><strong>${deviceInfo.os}</strong></td></tr>` : ""}
              ${deviceInfo.ip ? `<tr><td style="padding: 5px 0; color: #666;">IP Address:</td><td style="padding: 5px 0;"><strong>${deviceInfo.ip}</strong></td></tr>` : ""}
              ${deviceInfo.location ? `<tr><td style="padding: 5px 0; color: #666;">Location:</td><td style="padding: 5px 0;"><strong>${deviceInfo.location}</strong></td></tr>` : ""}
            </table>
          </div>
          <p><strong>Was this you?</strong></p>
          <p>If yes, you can safely ignore this email.</p>
          <div class="warning">
            <strong>Not you?</strong> If you don't recognize this login, your account may be compromised. Please:
            <ol style="margin: 10px 0;">
              <li><a href="${appUrl}/settings">Change your password immediately</a></li>
              <li>Review your active sessions in settings</li>
              <li>Enable Two-Factor Authentication if not already enabled</li>
            </ol>
          </div>
        </div>
        <div class="footer">
          <p>This is an automated security notification from WURM Tools.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
WURM Tools - New Login Detected

Hello ${username},

We noticed a new login to your account:

Time: ${time}
${deviceInfo.browser ? `Browser: ${deviceInfo.browser}` : ""}
${deviceInfo.os ? `Operating System: ${deviceInfo.os}` : ""}
${deviceInfo.ip ? `IP Address: ${deviceInfo.ip}` : ""}
${deviceInfo.location ? `Location: ${deviceInfo.location}` : ""}

Was this you?
If yes, you can safely ignore this email.

Not you?
If you don't recognize this login, your account may be compromised. Please:
1. Change your password immediately at ${appUrl}/settings
2. Review your active sessions
3. Enable Two-Factor Authentication

This is an automated security notification from WURM Tools.
  `;

  return sendEmail({
    to: email,
    subject: `New login to your WURM Tools account`,
    text,
    html,
  });
}

// Send account locked notification
export async function sendAccountLockedEmail(
  email: string,
  username: string,
  lockDuration: number  // in minutes
): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://wurm.tools";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>${emailStyles}</head>
    <body>
      <div class="container">
        <div class="header">
          <h1>WURM Tools</h1>
        </div>
        <div class="content">
          <h2>Account Temporarily Locked</h2>
          <p>Hello <strong>${username}</strong>,</p>
          <p>Your account has been temporarily locked due to multiple failed login attempts.</p>
          <div class="warning">
            <strong>Security Notice:</strong> Your account will be automatically unlocked in <strong>${lockDuration} minutes</strong>.
          </div>
          <p>If you forgot your password, you can <a href="${appUrl}/forgot">reset it here</a>.</p>
          <p>If you did not attempt to log in, someone may be trying to access your account. We recommend:</p>
          <ul>
            <li>Changing your password after the lockout ends</li>
            <li>Enabling Two-Factor Authentication</li>
          </ul>
        </div>
        <div class="footer">
          <p>This is an automated security notification from WURM Tools.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
WURM Tools - Account Temporarily Locked

Hello ${username},

Your account has been temporarily locked due to multiple failed login attempts.

Your account will be automatically unlocked in ${lockDuration} minutes.

If you forgot your password, you can reset it at ${appUrl}/forgot

If you did not attempt to log in, we recommend changing your password and enabling Two-Factor Authentication.

This is an automated security notification from WURM Tools.
  `;

  return sendEmail({
    to: email,
    subject: `WURM Tools - Account temporarily locked`,
    text,
    html,
  });
}
