"use client";

import Link from "next/link";
import { useState } from "react";
import Navigation from "./Navigation";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="forge-header sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-18 py-3">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            {/* Anvil Icon */}
            <div className="relative">
              <div className="w-12 h-12 flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-accent group-hover:text-accent-hover transition-colors"
                  viewBox="0 0 64 64"
                  fill="currentColor"
                >
                  {/* Anvil shape */}
                  <path d="M8 38 L12 28 L52 28 L56 38 L56 42 L8 42 Z" fill="currentColor" />
                  <path d="M16 42 L16 52 L48 52 L48 42" fill="currentColor" />
                  <path d="M20 52 L20 56 L44 56 L44 52" fill="currentColor" />
                  {/* Horn */}
                  <path d="M4 32 L12 28 L12 38 L8 38 L4 36 Z" fill="currentColor" />
                  {/* Top flat */}
                  <path d="M18 28 L18 24 L46 24 L46 28" fill="currentColor" opacity="0.8" />
                  {/* Hammer sparks */}
                  <circle cx="32" cy="18" r="2" fill="#c9a227" className="group-hover:animate-pulse" />
                  <circle cx="26" cy="14" r="1.5" fill="#ff6a2a" opacity="0.8" />
                  <circle cx="38" cy="14" r="1.5" fill="#ff6a2a" opacity="0.8" />
                  <circle cx="30" cy="10" r="1" fill="#ffd700" opacity="0.6" />
                  <circle cx="34" cy="12" r="1" fill="#ffd700" opacity="0.6" />
                </svg>
              </div>
              {/* Subtle glow effect */}
              <div className="absolute inset-0 bg-accent/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            {/* Brand Name */}
            <div>
              <h1 className="text-2xl font-bold tracking-wide">
                <span className="text-accent">BLACK</span>
                <span className="text-gold">FORGE</span>
                <span className="text-gray-500 text-lg">.tools</span>
              </h1>
              <p className="text-xs text-gray-600 tracking-widest uppercase hidden sm:block">
                Wurm Online Utilities
              </p>
            </div>
          </Link>

          {/* Decorative divider */}
          <div className="hidden lg:flex items-center mx-8 flex-1">
            <div className="forge-divider flex-1" />
            <span className="px-4 text-gold/30 text-sm">◆</span>
            <div className="forge-divider flex-1" />
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <Navigation />
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-gray-400 hover:text-accent transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gold/10">
            <Navigation mobile onItemClick={() => setMobileMenuOpen(false)} />
          </div>
        )}
      </div>
    </header>
  );
}
