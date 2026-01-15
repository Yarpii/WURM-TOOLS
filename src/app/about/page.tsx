"use client";

import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-bg-primary py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-text-primary mb-8">About Wurm Tools</h1>

        {/* Mission */}
        <section className="bg-bg-secondary rounded-lg border border-border p-6 mb-6">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Our Mission</h2>
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
        </section>

        {/* Features */}
        <section className="bg-bg-secondary rounded-lg border border-border p-6 mb-6">
          <h2 className="text-xl font-semibold text-text-primary mb-4">What We Offer</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-bg-tertiary rounded-lg">
              <h3 className="font-medium text-text-primary mb-2">Crafting Calculator</h3>
              <p className="text-sm text-text-muted">
                Calculate materials needed for any recipe with our comprehensive crafting tree.
              </p>
            </div>
            <div className="p-4 bg-bg-tertiary rounded-lg">
              <h3 className="font-medium text-text-primary mb-2">Skill Tracker</h3>
              <p className="text-sm text-text-muted">
                Track your skill progress and estimate time to reach your goals.
              </p>
            </div>
            <div className="p-4 bg-bg-tertiary rounded-lg">
              <h3 className="font-medium text-text-primary mb-2">Timer Dashboard</h3>
              <p className="text-sm text-text-muted">
                Never miss a timer again - track sleep bonus, crops, animals, and more.
              </p>
            </div>
            <div className="p-4 bg-bg-tertiary rounded-lg">
              <h3 className="font-medium text-text-primary mb-2">Event Calendar</h3>
              <p className="text-sm text-text-muted">
                Discover Impalongs, Rifts, and community events across all servers.
              </p>
            </div>
            <div className="p-4 bg-bg-tertiary rounded-lg">
              <h3 className="font-medium text-text-primary mb-2">World Map</h3>
              <p className="text-sm text-text-muted">
                Find deeds, merchants, landmarks, and resources on the interactive map.
              </p>
            </div>
            <div className="p-4 bg-bg-tertiary rounded-lg">
              <h3 className="font-medium text-text-primary mb-2">Marketplace</h3>
              <p className="text-sm text-text-muted">
                Buy, sell, and trade items with other players across servers.
              </p>
            </div>
          </div>
        </section>

        {/* Tech Stack */}
        <section className="bg-bg-secondary rounded-lg border border-border p-6 mb-6">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Built With</h2>
          <div className="flex flex-wrap gap-2">
            {["Next.js", "React", "TypeScript", "Tailwind CSS", "PostgreSQL"].map((tech) => (
              <span
                key={tech}
                className="px-3 py-1 bg-accent/10 text-accent rounded-full text-sm"
              >
                {tech}
              </span>
            ))}
          </div>
        </section>

        {/* Links */}
        <div className="flex flex-wrap gap-4 mt-8">
          <Link
            href="/contact"
            className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
          >
            Contact Us
          </Link>
          <Link
            href="/disclaimer"
            className="px-6 py-2 bg-bg-tertiary text-text-primary rounded-lg hover:bg-bg-hover transition-colors"
          >
            Disclaimer
          </Link>
        </div>
      </div>
    </div>
  );
}
