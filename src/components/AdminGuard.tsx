"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import Link from "next/link";

interface AdminGuardProps {
  children: React.ReactNode;
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <div className="inline-flex items-center gap-3 mb-4">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-text-muted">Verifying credentials...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <div className="max-w-md mx-auto bg-bg-secondary p-8 rounded-xl border border-border">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold mb-2 text-text-primary">
            Authentication Required
          </h2>
          <p className="text-text-muted mb-6">
            You must be logged in to access this area.
          </p>
          <Link
            href="/login"
            className="inline-block px-6 py-3 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors"
          >
            Login
          </Link>
        </div>
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <div className="max-w-md mx-auto bg-bg-secondary p-8 rounded-xl border border-danger/30">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold mb-2 text-text-primary">
            Access Denied
          </h2>
          <p className="text-text-muted mb-4">
            This area is restricted to administrators only.
          </p>
          <p className="text-text-muted text-sm mb-6">
            Logged in as <span className="text-accent">{user.username}</span> (role: {user.role})
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-bg-tertiary hover:bg-bg-hover text-text-primary rounded-lg font-medium transition-colors"
          >
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
