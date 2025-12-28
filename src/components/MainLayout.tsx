"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  isNew?: boolean;
}

const navItems: NavItem[] = [
  { href: "/", label: "Calculator", icon: "⚒" },
  { href: "/calculator", label: "Advanced", icon: "⚙", isNew: true },
  { href: "/skill-optimizer", label: "Skills", icon: "📈", isNew: true },
  { href: "/data", label: "Data", icon: "📦" },
  { href: "/admin", label: "Admin", icon: "🔧" },
];

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export default function MainLayout({ children, title, subtitle }: LayoutProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header */}
      <header className="forge-header sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <span className="text-3xl filter drop-shadow-lg group-hover:scale-110 transition-transform">
                  ⚔
                </span>
                <div className="absolute -inset-1 bg-accent/20 blur-md rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold tracking-wide">
                  <span className="text-accent">Blackforge</span>
                  <span className="text-gold">.Tools</span>
                </h1>
                <p className="text-xs text-gray-500 -mt-1">Wurm Online Crafting</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      relative px-4 py-2 rounded-lg transition-all duration-200
                      flex items-center gap-2 text-sm font-medium
                      ${isActive
                        ? "bg-accent/20 text-accent border border-accent/30"
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                      }
                    `}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                    {item.isNew && (
                      <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[10px] bg-accent text-white rounded-full font-bold">
                        NEW
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-400 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <nav className="md:hidden py-4 border-t border-gold/10">
              <div className="grid grid-cols-2 gap-2">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`
                        relative px-4 py-3 rounded-lg transition-all
                        flex items-center gap-2 text-sm font-medium
                        ${isActive
                          ? "bg-accent/20 text-accent border border-accent/30"
                          : "bg-white/5 text-gray-400"
                        }
                      `}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span>{item.label}</span>
                      {item.isNew && (
                        <span className="ml-auto px-1.5 py-0.5 text-[10px] bg-accent text-white rounded-full font-bold">
                          NEW
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </nav>
          )}
        </div>
      </header>

      {/* Page Title */}
      {title && (
        <div className="bg-gradient-to-b from-dark-card to-transparent py-8 border-b border-gold/10">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-3 mb-2">
              <span className="text-gold/30">◆</span>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-wide smoky-text">
                {title}
              </h1>
              <span className="text-gold/30">◆</span>
            </div>
            {subtitle && (
              <p className="text-gray-500 text-sm sm:text-base">{subtitle}</p>
            )}
            <div className="forge-divider mt-4 max-w-md mx-auto" />
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-gold/10 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <span>⚔</span>
              <span>Blackforge.Tools</span>
              <span className="text-gold/30">•</span>
              <span>Wurm Online Crafting Tools</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs">Made with 🔥 for Wurm crafters</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
