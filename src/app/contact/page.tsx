"use client";

import Link from "next/link";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-bg-primary py-12">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-text-primary mb-8">Contact</h1>

        {/* In-Game Contact */}
        <section className="bg-bg-secondary rounded-lg border border-border p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center">
              <span className="text-2xl font-bold text-accent">Y</span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-text-primary">Yarpiii</h2>
              <p className="text-text-muted">Creator of Blackforge Tools</p>
            </div>
          </div>

          <div className="bg-bg-tertiary rounded-lg p-4 mb-4">
            <div className="flex items-center gap-3 mb-2">
              <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              <span className="text-sm text-text-muted">Server</span>
            </div>
            <p className="text-lg font-medium text-text-primary ml-8">Celebration</p>
          </div>

          <div className="bg-accent/10 border border-accent/30 rounded-lg p-4">
            <p className="text-text-secondary">
              The best way to reach me is <strong className="text-text-primary">in-game</strong>.
              Send me a PM or look for me on Celebration!
            </p>
          </div>
        </section>

        {/* How to Contact */}
        <section className="bg-bg-secondary rounded-lg border border-border p-6 mb-6">
          <h2 className="text-xl font-semibold text-text-primary mb-4">How to Reach Me In-Game</h2>
          <ol className="space-y-4 text-text-secondary">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/20 text-accent text-sm flex items-center justify-center font-medium">1</span>
              <span>Open the chat window in Wurm Online</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/20 text-accent text-sm flex items-center justify-center font-medium">2</span>
              <span>Type: <code className="px-2 py-0.5 bg-bg-tertiary rounded text-text-primary">/tell Yarpiii</code></span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/20 text-accent text-sm flex items-center justify-center font-medium">3</span>
              <span>Send your message - I&apos;ll respond when I&apos;m online!</span>
            </li>
          </ol>
        </section>

        {/* GitHub Issues */}
        <section className="bg-bg-secondary rounded-lg border border-border p-6 mb-6">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Bug Reports & Feature Requests</h2>
          <p className="text-text-secondary mb-4">
            Found a bug or have a feature idea? The best place to report these is on our GitHub repository.
          </p>
          <a
            href="https://github.com/Yarpii/WURM-TOOLS/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-bg-tertiary rounded-lg text-text-primary hover:bg-bg-hover transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
            </svg>
            Open an Issue on GitHub
          </a>
        </section>

        {/* Back Link */}
        <div className="flex gap-4 mt-8">
          <Link
            href="/about"
            className="px-6 py-2 bg-bg-tertiary text-text-primary rounded-lg hover:bg-bg-hover transition-colors"
          >
            About Us
          </Link>
          <Link
            href="/"
            className="px-6 py-2 bg-bg-tertiary text-text-primary rounded-lg hover:bg-bg-hover transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
