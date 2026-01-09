"use client";

import Link from "next/link";
import { useState } from "react";

export default function ContactPage() {
  const [copiedCommand, setCopiedCommand] = useState(false);

  const copyCommand = () => {
    navigator.clipboard.writeText("/tell Yarpiii");
    setCopiedCommand(true);
    setTimeout(() => setCopiedCommand(false), 2000);
  };

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
              Get In Touch
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-text-primary mb-4">
              Let&apos;s Connect
            </h1>
            <p className="text-lg text-text-muted max-w-2xl mx-auto">
              Have questions, feedback, or just want to say hi?
              I&apos;d love to hear from you!
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pb-16 -mt-8">
        {/* Profile Card */}
        <section className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-accent/20 to-accent/5 rounded-2xl blur-xl" />
          <div className="relative bg-bg-secondary rounded-2xl border border-border overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full -translate-y-1/2 translate-x-1/2" />

            <div className="relative p-8">
              <div className="flex flex-col md:flex-row items-center gap-6">
                {/* Avatar with glow */}
                <div className="relative">
                  <div className="absolute inset-0 bg-accent/30 rounded-full blur-xl scale-110" />
                  <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center ring-4 ring-bg-primary">
                    <span className="text-4xl font-bold text-white">Y</span>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-green-500 rounded-full border-4 border-bg-secondary flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  </div>
                </div>

                <div className="text-center md:text-left flex-1">
                  <h2 className="text-2xl font-bold text-text-primary mb-1">Yarpiii</h2>
                  <p className="text-text-muted mb-3">Creator of Blackforge Tools</p>
                  <div className="flex flex-wrap justify-center md:justify-start gap-2">
                    <span className="px-3 py-1 bg-accent/10 text-accent text-sm rounded-full">
                      Celebration Server
                    </span>
                    <span className="px-3 py-1 bg-bg-tertiary text-text-secondary text-sm rounded-full">
                      Wurm Online Player
                    </span>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="hidden lg:flex gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-accent">24/7</div>
                    <div className="text-xs text-text-muted">Tool Support</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-accent">Free</div>
                    <div className="text-xs text-text-muted">Always</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Methods Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* In-Game Contact */}
          <section className="group bg-bg-secondary rounded-2xl border border-border p-6 hover:border-accent/50 transition-all duration-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-text-primary">In-Game Message</h3>
                <p className="text-sm text-text-muted">Fastest response</p>
              </div>
            </div>

            <div className="bg-bg-tertiary rounded-xl p-4 mb-4">
              <p className="text-sm text-text-muted mb-2">Send me a message with:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-bg-primary rounded-lg text-accent font-mono text-sm">
                  /tell Yarpiii
                </code>
                <button
                  onClick={copyCommand}
                  className="p-2 bg-bg-primary rounded-lg hover:bg-accent/20 transition-colors"
                  title="Copy command"
                >
                  {copiedCommand ? (
                    <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <p className="text-sm text-text-secondary">
              I&apos;ll respond as soon as I&apos;m online! Usually active during EU evening hours.
            </p>
          </section>

          {/* GitHub */}
          <section className="group bg-bg-secondary rounded-2xl border border-border p-6 hover:border-accent/50 transition-all duration-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-accent" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-text-primary">GitHub Issues</h3>
                <p className="text-sm text-text-muted">Bugs & Features</p>
              </div>
            </div>

            <p className="text-sm text-text-secondary mb-4">
              Found a bug or have a brilliant feature idea? GitHub is the best place for technical feedback.
            </p>

            <a
              href="https://github.com/Yarpii/WURM-TOOLS/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-bg-tertiary rounded-xl text-text-primary hover:bg-accent/20 hover:text-accent transition-all font-medium"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Report an Issue
            </a>
          </section>
        </div>

        {/* How It Works */}
        <section className="bg-bg-secondary rounded-2xl border border-border p-6 md:p-8 mb-8">
          <h3 className="text-xl font-semibold text-text-primary mb-6 text-center">
            How to Reach Me In-Game
          </h3>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="relative">
              <div className="hidden md:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-accent/50 to-transparent -translate-x-1/2" />
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center mb-4 shadow-lg shadow-accent/20">
                  <span className="text-2xl font-bold text-white">1</span>
                </div>
                <h4 className="font-medium text-text-primary mb-2">Open Chat</h4>
                <p className="text-sm text-text-muted">Press Enter or click the chat icon in Wurm Online</p>
              </div>
            </div>

            <div className="relative">
              <div className="hidden md:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-accent/50 to-transparent -translate-x-1/2" />
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center mb-4 shadow-lg shadow-accent/20">
                  <span className="text-2xl font-bold text-white">2</span>
                </div>
                <h4 className="font-medium text-text-primary mb-2">Type Command</h4>
                <p className="text-sm text-text-muted">Enter <code className="px-1.5 py-0.5 bg-bg-tertiary rounded text-accent">/tell Yarpiii</code></p>
              </div>
            </div>

            <div>
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center mb-4 shadow-lg shadow-accent/20">
                  <span className="text-2xl font-bold text-white">3</span>
                </div>
                <h4 className="font-medium text-text-primary mb-2">Send Message</h4>
                <p className="text-sm text-text-muted">Write your message and hit Enter!</p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="bg-bg-secondary rounded-2xl border border-border p-6 md:p-8 mb-8">
          <h3 className="text-xl font-semibold text-text-primary mb-6">
            Frequently Asked Questions
          </h3>

          <div className="space-y-4">
            <div className="bg-bg-tertiary rounded-xl p-4">
              <h4 className="font-medium text-text-primary mb-2 flex items-center gap-2">
                <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                When are you usually online?
              </h4>
              <p className="text-sm text-text-secondary pl-7">
                I&apos;m typically active during EU evening hours (18:00-23:00 CET), but I check messages daily!
              </p>
            </div>

            <div className="bg-bg-tertiary rounded-xl p-4">
              <h4 className="font-medium text-text-primary mb-2 flex items-center gap-2">
                <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                How quickly do you respond?
              </h4>
              <p className="text-sm text-text-secondary pl-7">
                In-game messages get the fastest response, usually within a few hours when I&apos;m playing. GitHub issues are checked daily.
              </p>
            </div>

            <div className="bg-bg-tertiary rounded-xl p-4">
              <h4 className="font-medium text-text-primary mb-2 flex items-center gap-2">
                <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Can I contribute to Blackforge Tools?
              </h4>
              <p className="text-sm text-text-secondary pl-7">
                Absolutely! Check out the GitHub repository to submit pull requests, report bugs, or suggest features.
              </p>
            </div>
          </div>
        </section>

        {/* Navigation */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/about"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-bg-secondary border border-border rounded-xl text-text-primary hover:border-accent/50 hover:text-accent transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            About Blackforge
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-accent text-white rounded-xl hover:bg-accent/90 transition-all shadow-lg shadow-accent/20"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
