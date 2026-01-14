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
