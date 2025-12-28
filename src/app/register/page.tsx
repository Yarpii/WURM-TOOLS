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

    // Validate passwords match
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

      // Redirect to home after successful registration
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
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-2">
            <span className="text-gold/30">◆</span>
            <h1 className="text-3xl font-bold tracking-wide">
              <span className="text-accent">Join</span>
              <span className="text-gold"> The Guild</span>
            </h1>
            <span className="text-gold/30">◆</span>
          </div>
          <p className="text-gray-500">Create your Blackforge account</p>
          <div className="forge-divider mt-4 max-w-xs mx-auto" />
        </div>

        {/* Register Form */}
        <div className="bg-dark-card p-8 rounded-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-gray-400 text-sm mb-2 uppercase tracking-wide">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                autoComplete="username"
                className="w-full px-4 py-3 bg-dark-input rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Choose a username"
              />
              <p className="text-gray-600 text-xs mt-1">At least 3 characters</p>
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-2 uppercase tracking-wide">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3 bg-dark-input rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="your@email.com"
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
                minLength={6}
                autoComplete="new-password"
                className="w-full px-4 py-3 bg-dark-input rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Choose a password"
              />
              <p className="text-gray-600 text-xs mt-1">At least 6 characters</p>
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-2 uppercase tracking-wide">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full px-4 py-3 bg-dark-input rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Confirm your password"
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
              {loading ? "Creating Account..." : "Forge Your Account"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-500 text-sm">
              Already a member?{" "}
              <Link href="/login" className="text-accent hover:text-gold transition-colors">
                Enter The Forge
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
