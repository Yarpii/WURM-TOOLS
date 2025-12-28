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
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="inline-flex items-center gap-3 mb-4">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-400">Verifying credentials...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-md mx-auto bg-dark-card p-8 rounded-xl">
          <div className="text-6xl mb-4 text-accent">🔒</div>
          <h2 className="text-2xl font-bold mb-2">
            <span className="text-accent">Authentication</span>
            <span className="text-gold"> Required</span>
          </h2>
          <p className="text-gray-500 mb-6">
            You must be logged in to access this area.
          </p>
          <Link
            href="/login"
            className="inline-block px-6 py-3 bg-accent hover:bg-accent-hover rounded-lg font-medium transition-colors"
          >
            Enter The Forge
          </Link>
        </div>
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-md mx-auto bg-dark-card p-8 rounded-xl border border-red-500/30">
          <div className="text-6xl mb-4">⚔️</div>
          <h2 className="text-2xl font-bold mb-2">
            <span className="text-accent">Access</span>
            <span className="text-gold"> Denied</span>
          </h2>
          <p className="text-gray-500 mb-4">
            Only Forge Masters may enter this chamber.
          </p>
          <p className="text-gray-600 text-sm mb-6">
            You are logged in as <span className="text-accent">{user.username}</span> (role: {user.role})
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-dark-input hover:bg-white/10 rounded-lg font-medium transition-colors"
          >
            Return to Calculator
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
