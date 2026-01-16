"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
  const router = useRouter();
  const { login, verify2FA, user } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 2FA state
  const [requires2FA, setRequires2FA] = useState(false);
  const [tempToken, setTempToken] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [expiresIn, setExpiresIn] = useState(0);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push(user.role === "admin" ? "/admin" : "/");
    }
  }, [user, router]);

  // Countdown timer for 2FA expiry
  useEffect(() => {
    if (expiresIn > 0) {
      const timer = setInterval(() => {
        setExpiresIn(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [expiresIn]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(username, password);

    if (result.requires2FA) {
      setRequires2FA(true);
      setTempToken(result.tempToken || "");
      setExpiresIn((result.expiresIn || 10) * 60); // Convert minutes to seconds
      setLoading(false);
      return;
    }

    if (!result.success) {
      setError(result.error || "Login failed");
      setLoading(false);
      return;
    }

    // Login successful - redirect based on role
    if (result.user?.role === "admin") {
      router.push("/admin");
    } else {
      router.push("/");
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await verify2FA(tempToken, verificationCode);

    if (!result.success) {
      setError(result.error || "Verification failed");
      setLoading(false);
      return;
    }

    // Login successful - redirect based on role
    if (result.user?.role === "admin") {
      router.push("/admin");
    } else {
      router.push("/");
    }
  };

  const cancelAndRetry = () => {
    setRequires2FA(false);
    setTempToken("");
    setVerificationCode("");
    setExpiresIn(0);
    setError("");
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Don't show form if already logged in
  if (user) {
    return null;
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            {requires2FA ? "Two-Factor Authentication" : "Login"}
          </h1>
          <p className="text-text-secondary">
            {requires2FA
              ? "Enter the verification code sent to your email"
              : "Sign in to access your account"}
          </p>
        </div>

        <div className="bg-bg-secondary p-8 rounded-xl border border-border">
          {!requires2FA ? (
            // Normal login form
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 bg-danger/10 border border-danger/30 rounded-lg text-danger text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-text-secondary text-sm mb-2">
                  Email or Character Name
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                  placeholder="your@email.com or character name"
                />
              </div>

              <div>
                <label className="block text-text-secondary text-sm mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                  placeholder="Enter your password"
                />
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-border bg-bg-tertiary text-accent focus:ring-accent focus:ring-offset-0"
                  />
                  <span className="text-sm text-text-muted group-hover:text-text-secondary transition-colors">
                    Remember me
                  </span>
                </label>
                <Link
                  href="/forgot"
                  className="text-sm text-accent hover:text-accent-hover transition-colors"
                >
                  Forgot password?
                </Link>
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
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>
          ) : (
            // 2FA verification form
            <form onSubmit={handle2FASubmit} className="space-y-6">
              {error && (
                <div className="p-4 bg-danger/10 border border-danger/30 rounded-lg text-danger text-sm">
                  {error}
                </div>
              )}

              <div className="p-4 bg-info/10 border border-info/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-info flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <p className="text-sm text-text-secondary">
                      We sent a 6-digit code to your email. Please check your inbox (and spam folder).
                    </p>
                    {expiresIn > 0 && (
                      <p className="text-xs text-text-muted mt-1">
                        Code expires in <span className="font-mono text-warning">{formatTime(expiresIn)}</span>
                      </p>
                    )}
                    {expiresIn === 0 && (
                      <p className="text-xs text-danger mt-1">
                        Code has expired. Please try again.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-text-secondary text-sm mb-2">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  maxLength={6}
                  autoComplete="one-time-code"
                  className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none text-center text-2xl tracking-widest font-mono"
                  placeholder="000000"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={cancelAndRetry}
                  className="flex-1 py-3 rounded-lg font-medium bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || verificationCode.length !== 6 || expiresIn === 0}
                  className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                    loading || verificationCode.length !== 6 || expiresIn === 0
                      ? "bg-bg-tertiary cursor-not-allowed text-text-muted"
                      : "bg-accent hover:bg-accent-hover text-white"
                  }`}
                >
                  {loading ? "Verifying..." : "Verify"}
                </button>
              </div>
            </form>
          )}

          {!requires2FA && (
            <div className="mt-6 text-center">
              <p className="text-text-muted text-sm">
                Don&apos;t have an account?{" "}
                <Link href="/register" className="text-accent hover:text-accent-hover transition-colors">
                  Sign up
                </Link>
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
