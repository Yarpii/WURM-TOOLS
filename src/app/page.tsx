"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

interface Stats {
  items: number;
  recipes: number;
}

export default function Home() {
  const [stats, setStats] = useState<Stats>({ items: 0, recipes: 0 });

  useEffect(() => {
    fetch("/api/items")
      .then((r) => r.json())
      .then((items) => setStats((s) => ({ ...s, items: items.length })));

    fetch("/api/admin/recipes")
      .then((r) => r.json())
      .then((recipes) => setStats((s) => ({ ...s, recipes: recipes.length })));
  }, []);

  const features = [
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
      title: "Material Calculator",
      description: "Calculate exact raw materials needed for any craftable item. See the complete crafting tree.",
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      title: "Skill Predictions",
      description: "Get success rates, quality predictions, and time estimates based on your skill level.",
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      title: "Skill Optimizer",
      description: "Find the best items to craft for optimal skill gains. Train efficiently with sweet spot recommendations.",
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
      title: "Reverse Lookup",
      description: "Find all items that use a specific material. Perfect for planning what to craft with your resources.",
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-text-primary mb-6">
            Crafting Calculator for{" "}
            <span className="text-accent">Wurm Online</span>
          </h1>
          <p className="text-lg text-text-secondary mb-8 max-w-2xl mx-auto">
            Calculate materials, predict success rates, and optimize your skill training.
            Everything you need to master crafting in Wurm Online.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/crafting"
              className="px-8 py-3 bg-accent text-white rounded-lg font-medium hover:bg-accent-hover transition-colors"
            >
              Start Crafting
            </Link>
            <Link
              href="/data"
              className="px-8 py-3 bg-bg-tertiary text-text-primary rounded-lg font-medium hover:bg-bg-hover transition-colors border border-border"
            >
              Manage Data
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 px-4 bg-bg-secondary border-y border-border">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-accent">{stats.items}</div>
              <div className="text-sm text-text-muted">Items</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-accent">{stats.recipes}</div>
              <div className="text-sm text-text-muted">Recipes</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-accent">3</div>
              <div className="text-sm text-text-muted">Calculators</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-accent">100%</div>
              <div className="text-sm text-text-muted">Free</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-text-primary mb-12">
            Everything You Need
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="p-6 bg-bg-secondary rounded-xl border border-border hover:border-border-hover transition-colors"
              >
                <div className="w-12 h-12 rounded-lg bg-accent/10 text-accent flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  {feature.title}
                </h3>
                <p className="text-text-secondary text-sm">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-bg-secondary border-t border-border">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-text-primary mb-4">
            Ready to Craft?
          </h2>
          <p className="text-text-secondary mb-6">
            Jump into the crafting calculator and start planning your next project.
          </p>
          <Link
            href="/crafting"
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-lg font-medium hover:bg-accent-hover transition-colors"
          >
            Open Calculator
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </section>
    </div>
  );
}
