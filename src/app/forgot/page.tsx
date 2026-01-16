"use client";

import { useState } from "react";
import Link from "next/link";

type TabType = "password" | "username";

export default function ForgotPage() {
  const [activeTab, setActiveTab] = useState<TabType>("password");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const endpoint = activeTab === "password"
        ? "/api/auth/forgot-password"
        : "/api/auth/forgot-username";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      setSuccess(data.message);
      setEmail("");
    } catch (err) {
      setError("Connection error: " + String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            Account Recovery
          </h1>
          <p className="text-text-secondary">
            Forgot your password or username? We can help.
          </p>
        </div>

        <div className="bg-bg-secondary p-8 rounded-xl border border-border">
          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab("password");
                setError("");
                setSuccess("");
              }}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === "password"
                  ? "bg-accent text-white"
                  : "bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-bg-hover"
              }`}
            >
              Forgot Password
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("username");
                setError("");
                setSuccess("");
              }}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === "username"
                  ? "bg-accent text-white"
                  : "bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-bg-hover"
              }`}
            >
              Forgot Username
            </button>
          </div>

          {/* Description */}
          <div className="mb-6 p-4 bg-info/10 border border-info/30 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-info flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-text-secondary">
                {activeTab === "password"
                  ? "Enter your email address and we'll send you a link to reset your password."
                  : "Enter your email address and we'll send you a reminder of your username(s)."}
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 bg-danger/10 border border-danger/30 rounded-lg text-danger text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="p-4 bg-success/10 border border-success/30 rounded-lg text-success text-sm">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="font-medium">Check your email!</p>
                    <p className="mt-1 text-success/80">{success}</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-text-secondary text-sm mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                placeholder="your@email.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-lg font-medium transition-all ${
                loading
                  ? "bg-bg-tertiary cursor-not-allowed text-text-muted"
                  : "bg-accent hover:bg-accent-hover text-white"
              }`}
            >
              {loading
                ? "Sending..."
                : activeTab === "password"
                  ? "Send Reset Link"
                  : "Send Username Reminder"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-text-muted text-sm">
              Remember your credentials?{" "}
              <Link href="/login" className="text-accent hover:text-accent-hover transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-6 p-4 bg-bg-secondary rounded-lg border border-border">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="text-sm text-text-muted">
              <p className="font-medium text-text-secondary mb-1">Security Notice</p>
              <p>
                For your privacy, we always show a success message even if the email doesn't exist in our system.
                This prevents others from discovering which emails are registered.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
