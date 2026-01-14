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

        {/* Open Source */}
        <section className="bg-bg-secondary rounded-lg border border-border p-6 mb-6">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Open Source</h2>
          <p className="text-text-secondary mb-4">
            Wurm Tools is open source and built with the community in mind. We welcome
            contributions, suggestions, and feedback from fellow Wurm players.
          </p>
          <a
            href="https://github.com/Yarpii/WURM-TOOLS"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-bg-tertiary rounded-lg text-text-primary hover:bg-bg-hover transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
            </svg>
            View on GitHub
          </a>
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
