"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
  const router = useRouter();
  const { login, user } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  if (user) {
    router.push(user.role === "admin" ? "/admin" : "/");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(username, password);

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
