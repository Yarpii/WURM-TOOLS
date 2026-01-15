"use client";

import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/20 via-bg-primary to-bg-primary" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-accent/10 via-transparent to-transparent" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />

        <div className="relative max-w-4xl mx-auto px-4 py-16 md:py-24">
          <div className="text-center mb-8">
            <span className="inline-block px-4 py-1.5 bg-accent/20 text-accent text-sm font-medium rounded-full mb-4">
              Community Project
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-text-primary mb-4">
              About Wurm Tools
            </h1>
            <p className="text-lg text-text-muted max-w-2xl mx-auto">
              Free tools and resources to enhance your Wurm Online experience
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pb-16 -mt-8">
        {/* Mission Card */}
        <section className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-accent/20 to-accent/5 rounded-2xl blur-xl" />
          <div className="relative bg-bg-secondary rounded-2xl border border-border overflow-hidden p-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-text-primary mb-3">Our Mission</h2>
                <p className="text-text-secondary mb-4">
                  Wurm Tools is a community-driven project created to enhance the Wurm Online
                  experience. We provide free tools and resources to help players craft, trade,
                  organize, and connect with each other.
                </p>
                <p className="text-text-secondary">
                  Whether you&apos;re a new player trying to understand crafting recipes, a merchant
                  looking to reach more customers, or an alliance leader managing your community,
                  we&apos;ve got tools to make your Wurm life easier.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-text-primary mb-6 flex items-center gap-2">
            <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            What We Offer
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="group bg-bg-secondary rounded-xl border border-border p-5 hover:border-accent/50 transition-all">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                  <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-text-primary mb-1">Crafting Calculator</h3>
                  <p className="text-sm text-text-muted">
                    Calculate materials needed for any recipe with our comprehensive crafting tree.
                  </p>
                </div>
              </div>
            </div>

            <div className="group bg-bg-secondary rounded-xl border border-border p-5 hover:border-accent/50 transition-all">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                  <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-text-primary mb-1">Skill Tracker</h3>
                  <p className="text-sm text-text-muted">
                    Track your skill progress and estimate time to reach your goals.
                  </p>
                </div>
              </div>
            </div>

            <div className="group bg-bg-secondary rounded-xl border border-border p-5 hover:border-accent/50 transition-all">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                  <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-text-primary mb-1">Timer Dashboard</h3>
                  <p className="text-sm text-text-muted">
                    Never miss a timer again - track sleep bonus, crops, animals, and more.
                  </p>
                </div>
              </div>
            </div>

            <div className="group bg-bg-secondary rounded-xl border border-border p-5 hover:border-accent/50 transition-all">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                  <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-text-primary mb-1">Event Calendar</h3>
                  <p className="text-sm text-text-muted">
                    Discover Impalongs, Rifts, and community events across all servers.
                  </p>
                </div>
              </div>
            </div>

            <div className="group bg-bg-secondary rounded-xl border border-border p-5 hover:border-accent/50 transition-all">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                  <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-text-primary mb-1">World Map</h3>
                  <p className="text-sm text-text-muted">
                    Find deeds, merchants, landmarks, and resources on the interactive map.
                  </p>
                </div>
              </div>
            </div>

            <div className="group bg-bg-secondary rounded-xl border border-border p-5 hover:border-accent/50 transition-all">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                  <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-text-primary mb-1">Marketplace</h3>
                  <p className="text-sm text-text-muted">
                    Buy, sell, and trade items with other players across servers.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Creator Section */}
        <section className="bg-bg-secondary rounded-2xl border border-border p-6 mb-8">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative">
              <div className="absolute inset-0 bg-accent/30 rounded-full blur-xl scale-110" />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center ring-4 ring-bg-primary">
                <span className="text-3xl font-bold text-white">Y</span>
              </div>
            </div>
            <div className="text-center md:text-left flex-1">
              <h3 className="text-lg font-semibold text-text-primary mb-1">Created by Yarpiii</h3>
              <p className="text-text-muted mb-3">Wurm Online player on Celebration</p>
              <p className="text-sm text-text-secondary">
                Built with love for the Wurm community. Have questions or suggestions?
                Feel free to reach out in-game!
              </p>
            </div>
          </div>
        </section>

        {/* Tech Stack */}
        <section className="bg-bg-secondary rounded-2xl border border-border p-6 mb-8">
          <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            Built With
          </h2>
          <div className="flex flex-wrap gap-2">
            {["Next.js", "React", "TypeScript", "Tailwind CSS", "MariaDB"].map((tech) => (
              <span
                key={tech}
                className="px-4 py-2 bg-bg-tertiary text-text-secondary rounded-lg text-sm border border-border"
              >
                {tech}
              </span>
            ))}
          </div>
        </section>

        {/* Navigation */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-accent text-white rounded-xl hover:bg-accent/90 transition-all shadow-lg shadow-accent/20"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Contact
          </Link>
          <Link
            href="/disclaimer"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-bg-secondary border border-border rounded-xl text-text-primary hover:border-accent/50 hover:text-accent transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Disclaimer
          </Link>
        </div>
      </div>
    </div>
  );
}
