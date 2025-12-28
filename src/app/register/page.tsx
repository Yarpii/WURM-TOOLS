"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed");
        setLoading(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError("Connection error: " + String(err));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">Create Account</h1>
          <p className="text-text-secondary">Sign up to get started</p>
        </div>

        <div className="bg-bg-secondary p-8 rounded-xl border border-border">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 bg-danger/10 border border-danger/30 rounded-lg text-danger text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-text-secondary text-sm mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                autoComplete="username"
                className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                placeholder="Choose a username"
              />
              <p className="text-text-muted text-xs mt-1">At least 3 characters</p>
            </div>

            <div>
              <label className="block text-text-secondary text-sm mb-2">
                Email
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

            <div>
              <label className="block text-text-secondary text-sm mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                placeholder="Choose a password"
              />
              <p className="text-text-muted text-xs mt-1">At least 6 characters</p>
            </div>

            <div>
              <label className="block text-text-secondary text-sm mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                placeholder="Confirm your password"
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
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-text-muted text-sm">
              Already have an account?{" "}
              <Link href="/login" className="text-accent hover:text-accent-hover transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
