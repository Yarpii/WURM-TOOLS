"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }

      if (data.user.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/");
      }
      router.refresh();
    } catch (err) {
      setError("Connection error: " + String(err));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">Login</h1>
          <p className="text-text-secondary">Sign in to access your account</p>
        </div>

        <div className="bg-bg-secondary p-8 rounded-xl border border-border">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-danger/10 border border-danger/30 rounded-lg text-danger text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-text-secondary text-sm mb-2">
                Username or Email
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                placeholder="Enter your username or email"
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

          <div className="mt-6 text-center">
            <p className="text-text-muted text-sm">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-accent hover:text-accent-hover transition-colors">
                Sign up
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-6 p-4 bg-bg-secondary rounded-lg border border-border">
          <p className="text-text-muted text-xs text-center">
            <span className="text-accent">Default Admin:</span> admin / admin123
          </p>
        </div>
      </div>
    </div>
  );
}
