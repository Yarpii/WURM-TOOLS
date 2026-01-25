"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ActiveSessionsSection from "./ActiveSessionsSection";
import {
  EmailStatus,
  EmailFormData,
  PasswordFormData,
  DeleteFormData,
} from "./types";

interface SecurityTabProps {
  emailStatus: EmailStatus | null;
  setEmailStatus: (status: EmailStatus | null) => void;
  saving: boolean;
  setSaving: (saving: boolean) => void;
  setError: (error: string) => void;
  setSuccess: (success: string) => void;
  logout: () => void;
}

export default function SecurityTab({
  emailStatus,
  setEmailStatus,
  saving,
  setSaving,
  setError,
  setSuccess,
  logout,
}: SecurityTabProps) {
  const router = useRouter();

  // Email form state
  const [emailForm, setEmailForm] = useState<EmailFormData>({
    email: emailStatus?.email || "",
    code: "",
  });
  const [emailStep, setEmailStep] = useState<"input" | "verify">("input");
  const [emailSending, setEmailSending] = useState(false);
  const [emailVerifying, setEmailVerifying] = useState(false);

  // Password form state
  const [passwordForm, setPasswordForm] = useState<PasswordFormData>({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  // Delete form state
  const [deleteForm, setDeleteForm] = useState<DeleteFormData>({
    password: "",
    confirmation: "",
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Email verification handlers
  const handleSendEmailCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!emailForm.email) {
      setError("Email address is required");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailForm.email)) {
      setError("Please enter a valid email address");
      return;
    }

    setEmailSending(true);

    try {
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_verification",
          email: emailForm.email,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to send verification code");
        return;
      }

      setSuccess("Verification code sent to your email!");
      setEmailStep("verify");
    } catch (err) {
      setError("Failed to send verification code: " + String(err));
    } finally {
      setEmailSending(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!emailForm.code || emailForm.code.length !== 6) {
      setError("Please enter the 6-digit verification code");
      return;
    }

    setEmailVerifying(true);

    try {
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify",
          code: emailForm.code,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid verification code");
        return;
      }

      setSuccess("Email verified successfully!");
      setEmailStep("input");
      setEmailForm({ email: data.email, code: "" });
      setEmailStatus(
        emailStatus
          ? { ...emailStatus, email: data.email, emailVerified: true }
          : null
      );
    } catch (err) {
      setError("Failed to verify email: " + String(err));
    } finally {
      setEmailVerifying(false);
    }
  };

  const handleToggle2FA = async (enable: boolean) => {
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: enable ? "enable_2fa" : "disable_2fa",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to update 2FA settings");
        return;
      }

      setSuccess(
        enable
          ? "Two-factor authentication enabled!"
          : "Two-factor authentication disabled"
      );
      setEmailStatus(
        emailStatus ? { ...emailStatus, twoFactorEnabled: enable } : null
      );
    } catch (err) {
      setError("Failed to update 2FA: " + String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setError("New passwords do not match");
      return;
    }

    if (passwordForm.new_password.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/account/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passwordForm),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to change password");
        return;
      }

      setSuccess("Password changed successfully! Please log in again.");
      setPasswordForm({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });

      // Redirect to login after short delay
      setTimeout(() => {
        logout();
        router.push("/login");
      }, 2000);
    } catch (err) {
      setError("Failed to change password: " + String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (deleteForm.confirmation !== "DELETE") {
      setError("Please type DELETE to confirm");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/account/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deleteForm),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to delete account");
        return;
      }

      // Redirect to home
      logout();
      router.push("/");
    } catch (err) {
      setError("Failed to delete account: " + String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Email & 2FA Section */}
      <div className="bg-bg-secondary rounded-xl border border-border p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-2">
          Email & Two-Factor Authentication
        </h2>
        <p className="text-text-muted mb-6">
          Add your email address to enable 2FA and receive important
          notifications
        </p>

        {/* Email Configuration Status */}
        {emailStatus && !emailStatus.emailConfigured && (
          <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg mb-4">
            <p className="text-warning text-sm">
              Email service is not configured on this server. Contact the
              administrator to enable email features.
            </p>
          </div>
        )}

        {/* Email Input/Verification Form */}
        {emailStep === "input" ? (
          <form onSubmit={handleSendEmailCode} className="space-y-4">
            <div>
              <label className="block text-sm text-text-secondary mb-2">
                Email Address
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={emailForm.email}
                  onChange={(e) =>
                    setEmailForm({ ...emailForm, email: e.target.value })
                  }
                  placeholder="your@email.com"
                  className="flex-1 px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                  disabled={emailSending}
                />
                <button
                  type="submit"
                  disabled={emailSending || !emailStatus?.emailConfigured}
                  className={`px-4 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${
                    emailSending || !emailStatus?.emailConfigured
                      ? "bg-bg-tertiary cursor-not-allowed text-text-muted"
                      : "bg-accent hover:bg-accent-hover text-white"
                  }`}
                >
                  {emailSending
                    ? "Sending..."
                    : emailStatus?.email
                      ? "Update Email"
                      : "Add Email"}
                </button>
              </div>
              {emailStatus?.email && emailStatus.emailVerified && (
                <p className="text-xs text-success mt-1 flex items-center gap-1">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Email verified
                </p>
              )}
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyEmail} className="space-y-4">
            <div className="p-4 bg-info/10 border border-info/30 rounded-lg">
              <p className="text-sm text-text-secondary">
                We sent a verification code to{" "}
                <strong className="text-text-primary">{emailForm.email}</strong>
                . Enter the 6-digit code below.
              </p>
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-2">
                Verification Code
              </label>
              <input
                type="text"
                value={emailForm.code}
                onChange={(e) =>
                  setEmailForm({
                    ...emailForm,
                    code: e.target.value.replace(/\D/g, "").slice(0, 6),
                  })
                }
                placeholder="000000"
                maxLength={6}
                className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none text-center text-2xl tracking-widest font-mono"
                disabled={emailVerifying}
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setEmailStep("input");
                  setEmailForm((prev) => ({ ...prev, code: "" }));
                }}
                className="flex-1 py-3 rounded-lg font-medium bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={emailVerifying || emailForm.code.length !== 6}
                className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                  emailVerifying || emailForm.code.length !== 6
                    ? "bg-bg-tertiary cursor-not-allowed text-text-muted"
                    : "bg-accent hover:bg-accent-hover text-white"
                }`}
              >
                {emailVerifying ? "Verifying..." : "Verify Code"}
              </button>
            </div>
          </form>
        )}

        {/* 2FA Toggle */}
        {emailStatus?.email && emailStatus.emailVerified && (
          <div className="mt-6 pt-6 border-t border-border">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-text-primary">
                  Two-Factor Authentication
                </h3>
                <p className="text-sm text-text-muted">
                  Require a verification code sent to your email when logging in
                </p>
              </div>
              <button
                onClick={() => handleToggle2FA(!emailStatus.twoFactorEnabled)}
                disabled={saving}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  emailStatus.twoFactorEnabled ? "bg-accent" : "bg-bg-tertiary"
                } ${saving ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    emailStatus.twoFactorEnabled
                      ? "translate-x-5"
                      : "translate-x-0"
                  }`}
                />
              </button>
            </div>
            {emailStatus.twoFactorEnabled && (
              <div className="mt-3 p-3 bg-success/10 border border-success/30 rounded-lg">
                <p className="text-sm text-success flex items-center gap-2">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                  Your account is protected with 2FA
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Active Sessions */}
      <ActiveSessionsSection />

      {/* Change Password */}
      <div className="bg-bg-secondary rounded-xl border border-border p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-2">
          Change Password
        </h2>
        <p className="text-text-muted mb-6">
          Update your password to keep your account secure
        </p>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-2">
              Current Password
            </label>
            <input
              type="password"
              value={passwordForm.current_password}
              onChange={(e) =>
                setPasswordForm({
                  ...passwordForm,
                  current_password: e.target.value,
                })
              }
              className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-2">
              New Password
            </label>
            <input
              type="password"
              value={passwordForm.new_password}
              onChange={(e) =>
                setPasswordForm({
                  ...passwordForm,
                  new_password: e.target.value,
                })
              }
              minLength={8}
              className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
              required
            />
            <p className="text-xs text-text-muted mt-1">
              Must be at least 8 characters
            </p>
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              value={passwordForm.confirm_password}
              onChange={(e) =>
                setPasswordForm({
                  ...passwordForm,
                  confirm_password: e.target.value,
                })
              }
              minLength={8}
              className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className={`w-full py-3 rounded-lg font-medium transition-all ${
              saving
                ? "bg-bg-tertiary cursor-not-allowed text-text-muted"
                : "bg-accent hover:bg-accent-hover text-white"
            }`}
          >
            {saving ? "Changing Password..." : "Change Password"}
          </button>
        </form>
      </div>

      {/* Delete Account */}
      <div className="bg-bg-secondary rounded-xl border border-danger/30 p-6">
        <h2 className="text-xl font-semibold text-danger mb-2">Danger Zone</h2>
        <p className="text-text-muted mb-4">
          Permanently delete your account and all associated data
        </p>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 bg-danger/20 text-danger rounded-lg hover:bg-danger/30 transition-colors"
          >
            Delete Account
          </button>
        ) : (
          <form onSubmit={handleDeleteAccount} className="space-y-4">
            <div className="p-4 bg-danger/10 border border-danger/30 rounded-lg mb-4">
              <p className="text-danger text-sm font-medium mb-2">
                This action cannot be undone!
              </p>
              <p className="text-text-muted text-sm">
                All your data will be permanently deleted, including orders,
                projects, prospects, merchants, and achievements.
              </p>
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-2">
                Enter your password
              </label>
              <input
                type="password"
                value={deleteForm.password}
                onChange={(e) =>
                  setDeleteForm({ ...deleteForm, password: e.target.value })
                }
                className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-danger focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-2">
                Type <span className="font-mono text-danger">DELETE</span> to
                confirm
              </label>
              <input
                type="text"
                value={deleteForm.confirmation}
                onChange={(e) =>
                  setDeleteForm({
                    ...deleteForm,
                    confirmation: e.target.value,
                  })
                }
                placeholder="DELETE"
                className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-danger focus:outline-none"
                required
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteForm({ password: "", confirmation: "" });
                }}
                className="flex-1 py-3 rounded-lg font-medium bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || deleteForm.confirmation !== "DELETE"}
                className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                  saving || deleteForm.confirmation !== "DELETE"
                    ? "bg-bg-tertiary cursor-not-allowed text-text-muted"
                    : "bg-danger hover:bg-danger/80 text-white"
                }`}
              >
                {saving ? "Deleting..." : "Delete My Account"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
