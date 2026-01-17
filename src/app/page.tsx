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
      title: "Forge & Craft",
      description: "Stop guessing, start crafting! Know exactly what you need before you begin",
      features: ["Full recipe breakdowns", "Quality predictions", "Skill grinding guides"],
      color: "from-orange-500 to-amber-600",
    },
    {
      href: "/skills",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      title: "Skill Mastery",
      description: "From newbie to legend! Track your grind and watch those numbers climb",
      features: ["Skill gain predictions", "Sleep bonus optimizer", "Goal progress tracker"],
      color: "from-yellow-500 to-orange-600",
    },
    {
      href: "/timers",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: "Timer Dashboard",
      description: "Set it and forget it! Get notified before your crops rot or your SB runs out",
      features: ["Sleep bonus alerts", "Crop & animal timers", "Meditation reminders"],
      color: "from-emerald-500 to-teal-600",
    },
    {
      href: "/cooking",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      title: "Cooking & Affinities",
      description: "Become a master chef! Calculate perfect recipes for any affinity",
      features: ["Affinity calculator", "CCFP nutrition tracker", "Player number discovery"],
      color: "from-orange-500 to-red-600",
    },
    {
      href: "/events",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      title: "Community Events",
      description: "Party time! Find impalongs, rifts, and cool community gatherings",
      features: ["Impalongs & Rifts", "Easy RSVP system", "Cross-server events"],
      color: "from-pink-500 to-rose-600",
    },
    {
      href: "/map",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      ),
      title: "World Atlas",
      description: "Lost? Not anymore! Find deeds, merchants, and all the good spots",
      features: ["Deed finder", "Merchant directory", "Resource hotspots"],
      color: "from-blue-500 to-indigo-600",
    },
    {
      href: "/market",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      title: "Trade Hub",
      description: "Cha-ching! Buy low, sell high, and become Wurm's next silver tycoon",
      features: ["Buy & sell orders", "Smart trade matching", "Price history"],
      color: "from-violet-500 to-purple-600",
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
      description: "Unite with fellow Wurmians!",
    },
    {
      href: "/merchants",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      title: "Merchants",
      description: "Find the best deals around",
    },
    {
      href: "/members",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      title: "Community",
      description: "Make new Wurm friends",
    },
    {
      href: "/achievements",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3h14M5 3v4a7 7 0 007 7m-7-7H2m17 0h3M19 3v4a7 7 0 01-7 7m0 0v4m0 4h-4m4 0h4" />
        </svg>
      ),
      title: "Achievements",
      description: "Complete goals, earn bragging rights",
    },
  ];

  const roadmapFeatures = [
    {
      title: "Deed Planner",
      description: "Drag-and-drop your dream deed! Plan buildings, fences, and terrain before you dig",
      icon: "🏗️",
      status: "planned",
    },
    {
      title: "Treasure Hunting",
      description: "Find buried treasures! Map decoder, loot tables, and hunting route planner",
      icon: "🗺️",
      status: "planned",
    },
    {
      title: "Discord Bot",
      description: "Get pings when your crops are ready! Timer alerts right in your Discord",
      icon: "🤖",
      status: "planned",
    },
    {
      title: "Skill Planner",
      description: "Plan your character's skill journey from noob to grandmaster",
      icon: "📈",
      status: "planned",
    },
    {
      title: "Mobile App",
      description: "Wurm Tools in your pocket! Manage everything on the go",
      icon: "📱",
      status: "future",
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
            Hammered together by Wurmians, for Wurmians!
          </div>

          <h1 className={`text-4xl md:text-6xl font-bold text-text-primary mb-6 ${isLoaded ? 'animate-fade-in-up animation-delay-100' : 'opacity-0'}`}>
            Your Adventure{" "}
            <span className="gradient-text-animated">
              Starts Here
            </span>
          </h1>

          <p className={`text-lg md:text-xl text-text-secondary mb-10 max-w-2xl mx-auto ${isLoaded ? 'animate-fade-in-up animation-delay-200' : 'opacity-0'}`}>
            Whether you're burning dinner, hitting your thumb with a hammer, or getting lost in the wilderness -
            we've got your back! Craft, cook, trade, and discover with the ultimate Wurm Online companion.
          </p>

          <div className={`flex flex-col sm:flex-row gap-4 justify-center ${isLoaded ? 'animate-fade-in-up animation-delay-300' : 'opacity-0'}`}>
            <Link
              href="/crafting"
              className="glow-button px-8 py-4 bg-accent text-white rounded-xl font-semibold hover:bg-accent-hover transition-all hover:scale-105 shadow-lg shadow-accent/25"
            >
              Start Crafting!
            </Link>
            <Link
              href="/cooking"
              className="px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-red-600 transition-all hover:scale-105 shadow-lg shadow-orange-500/25"
            >
              Cook Something Tasty
            </Link>
            <Link
              href="/register"
              className="px-8 py-4 bg-bg-secondary text-text-primary rounded-xl font-semibold hover:bg-bg-hover transition-all border border-border hover:border-accent shimmer-border"
            >
              Join the Adventure
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
              Pick Your Adventure
            </h2>
            <p className="text-text-secondary max-w-2xl mx-auto">
              Whether you're a confused newbie or a grizzled veteran, we've got something for everyone.
              Click around and find your new favorite tool!
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
            And There's More!
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

      {/* Roadmap / Coming Soon Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-medium mb-4">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Roadmap
            </div>
            <h2 className="text-3xl font-bold text-text-primary mb-4">
              What's Cooking?
            </h2>
            <p className="text-text-secondary max-w-2xl mx-auto">
              We're always building new stuff! Here's what's in the oven (pun intended).
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roadmapFeatures.map((feature, index) => (
              <div
                key={index}
                className="group p-6 bg-bg-secondary rounded-2xl border border-border hover:border-purple-500/30 transition-all duration-300"
              >
                <div className="flex items-start gap-4">
                  <div className="text-3xl">{feature.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-text-primary group-hover:text-purple-400 transition-colors">
                        {feature.title}
                      </h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        feature.status === "planned"
                          ? "bg-purple-500/20 text-purple-400"
                          : "bg-gray-500/20 text-gray-400"
                      }`}>
                        {feature.status === "planned" ? "Planned" : "Future"}
                      </span>
                    </div>
                    <p className="text-sm text-text-muted group-hover:text-text-secondary transition-colors">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <p className="text-text-muted text-sm">
              Got a cool idea?{" "}
              <Link href="/contact" className="text-accent hover:underline">
                Tell us! We love suggestions!
              </Link>
            </p>
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
            Ready to Level Up?
          </h2>
          <p className="text-text-secondary mb-8 max-w-xl mx-auto">
            Stop alt-tabbing to wikis and spreadsheets. Everything you need is right here,
            no account required!
          </p>

          <Link
            href="/crafting"
            className="glow-button inline-flex items-center gap-2 px-8 py-4 bg-accent text-white rounded-xl font-semibold hover:bg-accent-hover transition-all hover:scale-105 shadow-lg shadow-accent/25"
          >
            Let's Go!
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </section>
    </div>
  );
}
