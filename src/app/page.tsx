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

  const quickAccessTools = [
    {
      href: "/crafting",
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      ),
      title: "Crafting",
      color: "from-orange-500 to-amber-600",
    },
    {
      href: "/cooking",
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      title: "Cooking",
      color: "from-red-500 to-orange-600",
    },
    {
      href: "/market",
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      title: "Market",
      color: "from-violet-500 to-purple-600",
    },
    {
      href: "/map",
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      ),
      title: "Map",
      color: "from-blue-500 to-indigo-600",
    },
    {
      href: "/animals",
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19c-4 0-7-2-7-5 0-2 1.5-3.5 3-4l1-3c.5-1.5 2-2 3-2s2.5.5 3 2l1 3c1.5.5 3 2 3 4 0 3-3 5-7 5zm-3-5h.01M15 14h.01" />
        </svg>
      ),
      title: "Animals",
      color: "from-green-500 to-emerald-600",
    },
    {
      href: "/timers",
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: "Timers",
      color: "from-emerald-500 to-teal-600",
    },
    {
      href: "/events",
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      title: "Events",
      color: "from-pink-500 to-rose-600",
    },
    {
      href: "/skills",
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      title: "Skills",
      color: "from-yellow-500 to-orange-600",
    },
    {
      href: "/prices",
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
      title: "Prices",
      color: "from-cyan-500 to-blue-600",
    },
    {
      href: "/analytics",
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      title: "Analytics",
      color: "from-indigo-500 to-violet-600",
    },
  ];

  const playerTools = [
    {
      href: "/animals",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19c-4 0-7-2-7-5 0-2 1.5-3.5 3-4l1-3c.5-1.5 2-2 3-2s2.5.5 3 2l1 3c1.5.5 3 2 3 4 0 3-3 5-7 5zm-3-5h.01M15 14h.01" />
        </svg>
      ),
      title: "Animal Breeding",
      description: "Track traits, family trees, and breed scores",
    },
    {
      href: "/characters",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      title: "Characters",
      description: "Showcase your characters and skills",
    },
    {
      href: "/treasures",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      title: "Treasures",
      description: "Track treasure hunts and rare finds",
    },
    {
      href: "/achievements",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3h14M5 3v4a7 7 0 007 7m-7-7H2m17 0h3M19 3v4a7 7 0 01-7 7m0 0v4m0 4h-4m4 0h4" />
        </svg>
      ),
      title: "Achievements",
      description: "Set goals and track your progress",
    },
    {
      href: "/projects",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      ),
      title: "Projects",
      description: "Plan large crafting projects step by step",
    },
    {
      href: "/trades",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      ),
      title: "Trades",
      description: "Smart trade matching across servers",
    },
  ];

  const communityFeatures = [
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
      href: "/archaeology",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
        </svg>
      ),
      title: "Archaeology",
      description: "Discover old deeds and ruins",
    },
    {
      href: "/resources",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      title: "Resources",
      description: "Community guides and tools",
    },
    {
      href: "/events",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      title: "Events",
      description: "Impalongs, Rifts, and more",
    },
  ];

  // Feature showcase data for alternating sections
  const featureShowcases = [
    {
      id: "crafting",
      title: "Master the Forge",
      subtitle: "Crafting Calculator",
      description: "Stop guessing what materials you need! Our crafting calculator breaks down every recipe into its base components. Whether you're making a cart or a castle, know exactly what to gather before you start.",
      features: [
        "Complete recipe breakdowns to raw materials",
        "Quality predictions based on your skills",
        "Material quantity calculations",
        "Skill requirements at a glance",
      ],
      href: "/crafting",
      ctaText: "Start Crafting",
      gradient: "from-orange-500 to-amber-600",
      bgGradient: "from-orange-500/10 to-amber-600/5",
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      ),
    },
    {
      id: "cooking",
      title: "Become a Master Chef",
      subtitle: "Cooking & Affinities",
      description: "Unlock the secrets of Wurm cooking! Calculate your personal affinity recipes, track nutrition values, and discover your hidden player number. Perfect meals mean perfect buffs.",
      features: [
        "Personal affinity recipe calculator",
        "CCFP nutrition tracking",
        "Player number discovery tool",
        "Recipe complexity analysis",
      ],
      href: "/cooking",
      ctaText: "Cook Something",
      gradient: "from-red-500 to-orange-600",
      bgGradient: "from-red-500/10 to-orange-600/5",
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
    },
    {
      id: "animals",
      title: "Breed Like a Pro",
      subtitle: "Animal Breeding Manager",
      description: "The ultimate Wurm breeding companion! Track all your animals, manage stables, visualize family trees, and get intelligent breeding pair suggestions. With the complete trait database including point values, you'll optimize your herd in no time.",
      features: [
        "Complete trait database with 36 traits, points & AH requirements",
        "Family tree visualization up to 6 generations",
        "Breeding pair suggestions with inbreeding detection",
        "Herd statistics and trait distribution analytics",
      ],
      href: "/animals",
      ctaText: "Manage Animals",
      gradient: "from-green-500 to-emerald-600",
      bgGradient: "from-green-500/10 to-emerald-600/5",
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19c-4 0-7-2-7-5 0-2 1.5-3.5 3-4l1-3c.5-1.5 2-2 3-2s2.5.5 3 2l1 3c1.5.5 3 2 3 4 0 3-3 5-7 5zm-3-5h.01M15 14h.01" />
        </svg>
      ),
    },
    {
      id: "market",
      title: "Trade Like a Pro",
      subtitle: "Marketplace & Trading",
      description: "Buy low, sell high, become Wurm's next silver tycoon! Our marketplace connects buyers and sellers across all servers. Smart matching finds the perfect trades for you automatically.",
      features: [
        "Cross-server marketplace",
        "Smart trade matching",
        "Price history & analytics",
        "Merchant directory",
      ],
      href: "/market",
      ctaText: "Start Trading",
      gradient: "from-violet-500 to-purple-600",
      bgGradient: "from-violet-500/10 to-purple-600/5",
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      id: "skills",
      title: "Level Up Smarter",
      subtitle: "Skill Optimizer",
      description: "From newbie to legend! Track your skill progression, optimize your grinding sessions, and calculate exactly how long until you hit that next milestone. Your path to mastery starts here.",
      features: [
        "Skill gain predictions",
        "Sleep bonus optimizer",
        "Progress tracking dashboard",
        "Grinding efficiency tips",
      ],
      href: "/skills",
      ctaText: "Optimize Skills",
      gradient: "from-yellow-500 to-orange-600",
      bgGradient: "from-yellow-500/10 to-orange-600/5",
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      id: "map",
      title: "Never Get Lost Again",
      subtitle: "Interactive World Map",
      description: "Explore the world of Wurm like never before! Find deeds, merchants, resources, and points of interest across all servers. Your personal atlas for every adventure.",
      features: [
        "Interactive server maps",
        "Deed & merchant locator",
        "Custom markers & notes",
        "Resource hotspots",
      ],
      href: "/map",
      ctaText: "Explore Map",
      gradient: "from-blue-500 to-indigo-600",
      bgGradient: "from-blue-500/10 to-indigo-600/5",
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      ),
    },
    {
      id: "timers",
      title: "Perfect Timing",
      subtitle: "Timer Dashboard",
      description: "Never miss a crop harvest or let your sleep bonus expire again! Set custom timers for everything - crops, animals, meditation, and more. Get notified before it's too late.",
      features: [
        "Sleep bonus tracking",
        "Crop & animal timers",
        "Meditation cooldowns",
        "Custom reminder alerts",
      ],
      href: "/timers",
      ctaText: "Set Timers",
      gradient: "from-emerald-500 to-teal-600",
      bgGradient: "from-emerald-500/10 to-teal-600/5",
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: "analytics",
      title: "Data-Driven Decisions",
      subtitle: "Price Tracking & Analytics",
      description: "Stay ahead of the market with real-time price tracking, trend analysis, and custom alerts. Know when to buy, when to sell, and never miss a deal again.",
      features: [
        "Real-time price tracking across servers",
        "Custom price alerts and notifications",
        "Historical trend analysis",
        "Market comparison tools",
      ],
      href: "/analytics",
      ctaText: "View Analytics",
      gradient: "from-indigo-500 to-violet-600",
      bgGradient: "from-indigo-500/10 to-violet-600/5",
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
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
            we've got your back! Craft, cook, trade, breed, and discover with the ultimate Wurm Online companion.
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

      {/* Quick Access Tools */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className={`text-center mb-10 ${isLoaded ? 'animate-fade-in-up animation-delay-500' : 'opacity-0'}`}>
            <h2 className="text-2xl font-bold text-text-primary mb-3">
              Quick Access
            </h2>
            <p className="text-text-secondary">
              Jump straight to your favorite tools
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-3">
            {quickAccessTools.map((feature, index) => (
              <Link
                key={index}
                href={feature.href}
                className={`group relative p-3 bg-bg-secondary rounded-xl border border-border hover:border-accent/50 transition-all duration-300 hover:translate-y-[-4px] hover:shadow-lg hover:shadow-accent/10 text-center ${isLoaded ? 'animate-fade-in-up' : 'opacity-0'}`}
                style={{ animationDelay: `${600 + index * 50}ms` }}
              >
                <div className={`w-10 h-10 mx-auto rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center text-white mb-2 group-hover:scale-110 transition-transform duration-300 shadow-md`}>
                  {feature.icon}
                </div>
                <h3 className="text-xs font-medium text-text-primary group-hover:text-accent transition-colors">
                  {feature.title}
                </h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Player Tools Section */}
      <section className="py-20 px-4 bg-bg-secondary border-y border-border relative overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute w-64 h-64 bg-green-500/5 rounded-full -top-32 -right-32 blur-3xl" />
          <div className="absolute w-48 h-48 bg-yellow-500/5 rounded-full -bottom-24 -left-24 blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-medium mb-4">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Player Tools
            </div>
            <h2 className="text-3xl font-bold text-text-primary mb-4">
              Power Up Your Gameplay
            </h2>
            <p className="text-text-secondary max-w-2xl mx-auto">
              Track your animals, plan projects, manage trades, and reach your goals faster with these personal tools.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {playerTools.map((feature, index) => (
              <Link
                key={index}
                href={feature.href}
                className="group p-6 rounded-2xl bg-bg-primary border border-border hover:border-accent/50 transition-all duration-300 hover:translate-y-[-4px] hover:shadow-xl hover:shadow-accent/10"
              >
                <div className="w-14 h-14 rounded-xl bg-accent/10 text-accent flex items-center justify-center mb-4 group-hover:bg-accent group-hover:text-white transition-all duration-300 group-hover:scale-110">
                  {feature.icon}
                </div>
                <h4 className="text-lg font-semibold text-text-primary group-hover:text-accent transition-colors mb-2">
                  {feature.title}
                </h4>
                <p className="text-text-muted group-hover:text-text-secondary transition-colors">
                  {feature.description}
                </p>
                <div className="mt-4 flex items-center gap-2 text-accent font-medium text-sm opacity-0 group-hover:opacity-100 transition-all">
                  <span>Open</span>
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Community Features */}
      <section className="py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute w-64 h-64 bg-accent/5 rounded-full -top-32 -right-32 blur-3xl" />
          <div className="absolute w-48 h-48 bg-purple-500/5 rounded-full -bottom-24 -left-24 blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-medium mb-4">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Community
            </div>
            <h2 className="text-3xl font-bold text-text-primary mb-4">
              Join the Community
            </h2>
            <p className="text-text-secondary max-w-2xl mx-auto">
              Connect with fellow Wurmians, share your achievements, and be part of something awesome.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {communityFeatures.map((feature, index) => (
              <Link
                key={index}
                href={feature.href}
                className="group p-6 rounded-2xl bg-bg-secondary border border-border hover:border-accent/50 transition-all duration-300 hover:translate-y-[-4px] hover:shadow-xl hover:shadow-accent/10"
              >
                <div className="w-14 h-14 rounded-xl bg-accent/10 text-accent flex items-center justify-center mb-4 group-hover:bg-accent group-hover:text-white transition-all duration-300 group-hover:scale-110">
                  {feature.icon}
                </div>
                <h4 className="text-lg font-semibold text-text-primary group-hover:text-accent transition-colors mb-2">
                  {feature.title}
                </h4>
                <p className="text-text-muted group-hover:text-text-secondary transition-colors">
                  {feature.description}
                </p>
                <div className="mt-4 flex items-center gap-2 text-accent font-medium text-sm opacity-0 group-hover:opacity-100 transition-all">
                  <span>Explore</span>
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Showcases - Alternating Sections */}
      {featureShowcases.map((feature, index) => (
        <section
          key={feature.id}
          className={`py-24 px-4 relative overflow-hidden ${
            index % 2 === 0 ? "bg-bg-primary" : "bg-bg-secondary"
          }`}
        >
          {/* Background gradient decoration */}
          <div
            className={`absolute inset-0 bg-gradient-to-br ${feature.bgGradient} opacity-50`}
          />
          <div
            className={`absolute ${
              index % 2 === 0 ? "-right-32 -top-32" : "-left-32 -bottom-32"
            } w-96 h-96 bg-gradient-to-br ${feature.gradient} opacity-5 rounded-full blur-3xl`}
          />

          <div className="max-w-6xl mx-auto relative">
            <div
              className={`flex flex-col ${
                index % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
              } items-center gap-12 lg:gap-16`}
            >
              {/* Content Side */}
              <div className="flex-1 text-center lg:text-left">
                <div
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${feature.gradient} bg-opacity-10 border border-white/10 text-white text-sm font-medium mb-4`}
                  style={{
                    background: `linear-gradient(to right, ${feature.gradient.includes("orange") ? "rgba(249, 115, 22, 0.1)" : feature.gradient.includes("red") ? "rgba(239, 68, 68, 0.1)" : feature.gradient.includes("yellow") ? "rgba(234, 179, 8, 0.1)" : feature.gradient.includes("violet") ? "rgba(139, 92, 246, 0.1)" : feature.gradient.includes("blue") ? "rgba(59, 130, 246, 0.1)" : feature.gradient.includes("green") ? "rgba(34, 197, 94, 0.1)" : feature.gradient.includes("indigo") ? "rgba(99, 102, 241, 0.1)" : "rgba(16, 185, 129, 0.1)"}, transparent)`,
                  }}
                >
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-white`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <span className="text-text-secondary">{feature.subtitle}</span>
                </div>

                <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
                  {feature.title}
                </h2>

                <p className="text-lg text-text-secondary mb-8 max-w-xl">
                  {feature.description}
                </p>

                <ul className="space-y-3 mb-8">
                  {feature.features.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-3 text-text-secondary justify-center lg:justify-start"
                    >
                      <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${feature.gradient} flex items-center justify-center flex-shrink-0`}>
                        <svg
                          className="w-3.5 h-3.5 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>

                <Link
                  href={feature.href}
                  className={`inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r ${feature.gradient} text-white rounded-xl font-semibold hover:opacity-90 transition-all hover:scale-105 shadow-lg`}
                >
                  {feature.ctaText}
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                </Link>
              </div>

              {/* Image/Visual Side */}
              <div className="flex-1 w-full max-w-lg lg:max-w-none">
                <div
                  className={`relative aspect-[4/3] rounded-2xl bg-gradient-to-br ${feature.bgGradient} border border-border overflow-hidden group`}
                >
                  {/* Placeholder pattern */}
                  <div className="absolute inset-0 opacity-30">
                    <div className="absolute inset-0" style={{
                      backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
                      backgroundSize: "24px 24px",
                    }} />
                  </div>

                  {/* Feature icon centered */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div
                      className={`w-32 h-32 rounded-3xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-white shadow-2xl group-hover:scale-110 transition-transform duration-500`}
                    >
                      {feature.icon}
                    </div>
                  </div>

                  {/* Decorative elements */}
                  <div className={`absolute top-4 right-4 w-16 h-16 rounded-xl bg-gradient-to-br ${feature.gradient} opacity-20 blur-xl`} />
                  <div className={`absolute bottom-4 left-4 w-24 h-24 rounded-full bg-gradient-to-br ${feature.gradient} opacity-10 blur-2xl`} />

                  {/* Screenshot placeholder text */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-bg-secondary/80 backdrop-blur-sm rounded-lg border border-border">
                    <span className="text-xs text-text-muted">Screenshot coming soon</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      ))}

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
            no account required for public tools!
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/crafting"
              className="glow-button inline-flex items-center gap-2 px-8 py-4 bg-accent text-white rounded-xl font-semibold hover:bg-accent-hover transition-all hover:scale-105 shadow-lg shadow-accent/25"
            >
              Let's Go!
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-4 bg-bg-secondary text-text-primary rounded-xl font-semibold hover:bg-bg-hover transition-all border border-border hover:border-accent"
            >
              Create Account
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
