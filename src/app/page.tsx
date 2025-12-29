"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";

interface Stats {
  items: number;
  recipes: number;
  members: number;
  orders: number;
}

// Animated counter hook
function useCountUp(target: number, duration: number = 2000) {
  const [count, setCount] = useState(0);
  const countRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0) return;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);

      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      countRef.current = Math.floor(easeOutQuart * target);
      setCount(countRef.current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);

    return () => {
      startTimeRef.current = null;
    };
  }, [target, duration]);

  return count;
}

export default function Home() {
  const [stats, setStats] = useState<Stats>({ items: 0, recipes: 0, members: 0, orders: 0 });
  const [isLoaded, setIsLoaded] = useState(false);

  // Animated counters
  const animatedItems = useCountUp(stats.items);
  const animatedRecipes = useCountUp(stats.recipes);
  const animatedMembers = useCountUp(stats.members);
  const animatedOrders = useCountUp(stats.orders);

  useEffect(() => {
    // Trigger entrance animations
    setIsLoaded(true);

    // Fetch stats in parallel
    Promise.all([
      fetch("/api/items").then(r => r.json()),
      fetch("/api/admin/recipes").then(r => r.json()),
      fetch("/api/members").then(r => r.json()),
      fetch("/api/orders?stats=1").then(r => r.json()),
    ]).then(([items, recipes, members, orderStats]) => {
      setStats({
        items: Array.isArray(items) ? items.length : 0,
        recipes: Array.isArray(recipes) ? recipes.length : 0,
        members: Array.isArray(members) ? members.length : 0,
        orders: orderStats?.active || 0,
      });
    }).catch(() => {
      // Fallback if any request fails
    });
  }, []);

  const mainFeatures = [
    {
      href: "/crafting",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      ),
      title: "Crafting",
      description: "Material calculator, success predictions, and skill optimizer",
      features: ["Recipe & base material modes", "Success rate predictions", "Skill grinding paths"],
      color: "from-orange-500 to-amber-600",
    },
    {
      href: "/market",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      title: "Marketplace",
      description: "Buy, sell, and trade items with the community",
      features: ["Buy & sell orders", "Trade offers", "Price tracking"],
      color: "from-emerald-500 to-teal-600",
    },
    {
      href: "/merchants",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      title: "Merchants",
      description: "Find in-game merchants and their stock",
      features: ["Merchant directory", "Inventory search", "Location maps"],
      color: "from-violet-500 to-purple-600",
    },
    {
      href: "/members",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      title: "Community",
      description: "Connect with other Wurm players",
      features: ["Member profiles", "Server filtering", "Contact players"],
      color: "from-blue-500 to-cyan-600",
    },
  ];

  const additionalFeatures = [
    {
      href: "/alliances",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
        </svg>
      ),
      title: "Alliances",
      description: "Create and manage player alliances",
    },
    {
      href: "/data",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
        </svg>
      ),
      title: "Data Management",
      description: "Import, export, and manage item data",
    },
    {
      href: "/settings",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      title: "Profile & Settings",
      description: "Customize your experience",
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        {/* Animated background gradient */}
        <div className="hero-gradient" />

        {/* Floating orbs */}
        <div className="floating-orb w-96 h-96 bg-accent/20 -top-48 -left-48" style={{ animationDelay: '0s' }} />
        <div className="floating-orb w-64 h-64 bg-orange-500/15 top-20 -right-32" style={{ animationDelay: '2s', animationDuration: '10s' }} />
        <div className="floating-orb w-48 h-48 bg-purple-500/10 bottom-0 left-1/4" style={{ animationDelay: '4s', animationDuration: '12s' }} />

        {/* Particles */}
        <div className="particles-container">
          <div className="particle" />
          <div className="particle" />
          <div className="particle" />
          <div className="particle" />
          <div className="particle" />
          <div className="particle" />
        </div>

        <div className="max-w-5xl mx-auto text-center relative">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-medium mb-6 badge-shine ${isLoaded ? 'animate-fade-in-up' : 'opacity-0'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Community-driven toolkit for Wurm Online
          </div>

          <h1 className={`text-4xl md:text-6xl font-bold text-text-primary mb-6 ${isLoaded ? 'animate-fade-in-up animation-delay-100' : 'opacity-0'}`}>
            Welcome to{" "}
            <span className="gradient-text-animated">
              Blackforge
            </span>
          </h1>

          <p className={`text-lg md:text-xl text-text-secondary mb-10 max-w-2xl mx-auto ${isLoaded ? 'animate-fade-in-up animation-delay-200' : 'opacity-0'}`}>
            Your all-in-one companion for Wurm Online. Calculate materials, optimize skill training,
            trade with players, and connect with the community.
          </p>

          <div className={`flex flex-col sm:flex-row gap-4 justify-center ${isLoaded ? 'animate-fade-in-up animation-delay-300' : 'opacity-0'}`}>
            <Link
              href="/crafting"
              className="glow-button px-8 py-4 bg-accent text-white rounded-xl font-semibold hover:bg-accent-hover transition-all hover:scale-105 shadow-lg shadow-accent/25"
            >
              Open Crafting Calculator
            </Link>
            <Link
              href="/register"
              className="px-8 py-4 bg-bg-secondary text-text-primary rounded-xl font-semibold hover:bg-bg-hover transition-all border border-border hover:border-accent shimmer-border"
            >
              Join the Community
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className={`py-8 px-4 bg-bg-secondary border-y border-border ${isLoaded ? 'animate-fade-in animation-delay-400' : 'opacity-0'}`}>
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center group cursor-default">
              <div className="text-3xl md:text-4xl font-bold text-accent stat-number">{animatedItems}</div>
              <div className="text-sm text-text-muted mt-1 group-hover:text-text-secondary transition-colors">Items in Database</div>
            </div>
            <div className="text-center group cursor-default">
              <div className="text-3xl md:text-4xl font-bold text-accent stat-number">{animatedRecipes}</div>
              <div className="text-sm text-text-muted mt-1 group-hover:text-text-secondary transition-colors">Crafting Recipes</div>
            </div>
            <div className="text-center group cursor-default">
              <div className="text-3xl md:text-4xl font-bold text-accent stat-number">{animatedMembers}</div>
              <div className="text-sm text-text-muted mt-1 group-hover:text-text-secondary transition-colors">Community Members</div>
            </div>
            <div className="text-center group cursor-default">
              <div className="text-3xl md:text-4xl font-bold text-accent stat-number">{animatedOrders}</div>
              <div className="text-sm text-text-muted mt-1 group-hover:text-text-secondary transition-colors">Active Orders</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Features */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className={`text-center mb-12 ${isLoaded ? 'animate-fade-in-up animation-delay-500' : 'opacity-0'}`}>
            <h2 className="text-3xl font-bold text-text-primary mb-4">
              Everything You Need
            </h2>
            <p className="text-text-secondary max-w-2xl mx-auto">
              From crafting calculations to community features, Blackforge has the tools to enhance your Wurm experience.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {mainFeatures.map((feature, index) => (
              <Link
                key={index}
                href={feature.href}
                className={`feature-card shimmer-border group relative p-6 bg-bg-secondary rounded-2xl border border-border hover:border-accent/50 overflow-hidden ${isLoaded ? 'animate-fade-in-up' : 'opacity-0'}`}
                style={{ animationDelay: `${600 + index * 100}ms` }}
              >
                {/* Gradient overlay on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />

                <div className="relative">
                  <div className={`icon-bounce w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-white mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg`}>
                    {feature.icon}
                  </div>

                  <h3 className="text-xl font-semibold text-text-primary mb-2 group-hover:text-accent transition-colors">
                    {feature.title}
                  </h3>

                  <p className="text-text-secondary mb-4">
                    {feature.description}
                  </p>

                  <ul className="space-y-2">
                    {feature.features.map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-text-muted group-hover:text-text-secondary transition-colors" style={{ transitionDelay: `${i * 50}ms` }}>
                        <svg className="w-4 h-4 text-success flex-shrink-0 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {item}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-4 flex items-center gap-2 text-accent font-medium text-sm opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0">
                    <span>Explore</span>
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Additional Features */}
      <section className="py-16 px-4 bg-bg-secondary border-y border-border relative overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute w-64 h-64 bg-accent/5 rounded-full -top-32 -right-32 blur-3xl" />
          <div className="absolute w-48 h-48 bg-purple-500/5 rounded-full -bottom-24 -left-24 blur-3xl" />
        </div>

        <div className="max-w-5xl mx-auto relative">
          <h3 className="text-lg font-semibold text-text-primary mb-6 text-center">
            More Features
          </h3>
          <div className="grid sm:grid-cols-3 gap-4">
            {additionalFeatures.map((feature, index) => (
              <Link
                key={index}
                href={feature.href}
                className="flex items-start gap-4 p-4 rounded-xl bg-bg-primary border border-border hover:border-accent/50 transition-all duration-300 group hover:translate-y-[-4px] hover:shadow-lg hover:shadow-accent/10"
              >
                <div className="w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center flex-shrink-0 group-hover:bg-accent group-hover:text-white transition-all duration-300 group-hover:scale-110 group-hover:rotate-6">
                  {feature.icon}
                </div>
                <div>
                  <h4 className="font-medium text-text-primary group-hover:text-accent transition-colors">
                    {feature.title}
                  </h4>
                  <p className="text-sm text-text-muted mt-1 group-hover:text-text-secondary transition-colors">
                    {feature.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
        </div>

        <div className="max-w-3xl mx-auto text-center relative">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mx-auto mb-6 icon-bounce hover:bg-accent hover:text-white transition-all duration-300 cursor-default">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
          </div>

          <h2 className="text-3xl font-bold text-text-primary mb-4">
            Ready to Start Crafting?
          </h2>
          <p className="text-text-secondary mb-8 max-w-xl mx-auto">
            Jump into the crafting calculator and start planning your next project.
            No registration required to use the calculators.
          </p>

          <Link
            href="/crafting"
            className="glow-button inline-flex items-center gap-2 px-8 py-4 bg-accent text-white rounded-xl font-semibold hover:bg-accent-hover transition-all hover:scale-105 shadow-lg shadow-accent/25"
          >
            Open Crafting Calculator
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </section>
    </div>
  );
}
