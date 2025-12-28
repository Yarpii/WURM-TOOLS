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

      // Redirect based on role
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
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-2">
            <span className="text-gold/30">◆</span>
            <h1 className="text-3xl font-bold tracking-wide">
              <span className="text-accent">Enter</span>
              <span className="text-gold"> The Forge</span>
            </h1>
            <span className="text-gold/30">◆</span>
          </div>
          <p className="text-gray-500">Sign in to access your account</p>
          <div className="forge-divider mt-4 max-w-xs mx-auto" />
        </div>

        {/* Login Form */}
        <div className="bg-dark-card p-8 rounded-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-gray-400 text-sm mb-2 uppercase tracking-wide">
                Username or Email
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                className="w-full px-4 py-3 bg-dark-input rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Enter your username or email"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-2 uppercase tracking-wide">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-4 py-3 bg-dark-input rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-lg font-medium transition-all ${
                loading
                  ? "bg-gray-600 cursor-not-allowed text-gray-400"
                  : "bg-accent hover:bg-accent-hover text-white ember-glow"
              }`}
            >
              {loading ? "Entering..." : "Enter The Forge"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-500 text-sm">
              Not yet a member?{" "}
              <Link href="/register" className="text-accent hover:text-gold transition-colors">
                Join the Guild
              </Link>
            </p>
          </div>
        </div>

        {/* Demo credentials hint */}
        <div className="mt-6 p-4 bg-dark-card/50 rounded-lg border border-gold/10">
          <p className="text-gray-600 text-xs text-center">
            <span className="text-gold">Default Admin:</span> admin / admin123
          </p>
        </div>
      </div>
    </div>
  );
}
