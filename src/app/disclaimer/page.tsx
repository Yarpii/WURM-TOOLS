"use client";

import Link from "next/link";

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-bg-primary to-bg-primary" />
        <div className="absolute top-20 right-10 w-72 h-72 bg-accent/5 rounded-full blur-3xl" />

        <div className="relative max-w-4xl mx-auto px-4 py-12 md:py-16">
          <div className="text-center">
            <span className="inline-block px-4 py-1.5 bg-accent/20 text-accent text-sm font-medium rounded-full mb-4">
              Legal Notice
            </span>
            <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
              Disclaimer
            </h1>
            <p className="text-text-muted max-w-2xl mx-auto">
              Important information about Wurm Tools and its relationship with Wurm Online
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pb-16 -mt-4">
        {/* Not Affiliated - Important Notice */}
        <section className="relative mb-6">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 to-transparent rounded-2xl blur-xl" />
          <div className="relative bg-bg-secondary rounded-2xl border border-yellow-500/30 p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-text-primary mb-2">Not Affiliated with Wurm Online</h2>
                <p className="text-text-secondary mb-3">
                  Wurm Tools is an independent, fan-made project created by and for the Wurm Online community.
                  This website is <strong className="text-text-primary">NOT</strong> affiliated with, endorsed by,
                  or in any way officially connected with:
                </p>
                <ul className="space-y-1 text-text-secondary mb-3">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full" />
                    Code Club AB
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full" />
                    Wurm Online / Wurm Unlimited
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full" />
                    Any of their subsidiaries or affiliates
                  </li>
                </ul>
                <p className="text-sm text-text-muted">
                  The official Wurm Online website:{" "}
                  <a
                    href="https://www.wurmonline.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline"
                  >
                    wurmonline.com
                  </a>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Other Sections */}
        <div className="space-y-4">
          {/* Trademarks */}
          <section className="bg-bg-secondary rounded-xl border border-border p-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h2 className="font-semibold text-text-primary mb-2">Trademarks</h2>
                <p className="text-sm text-text-secondary">
                  Wurm Online, Wurm Unlimited, and all related names, logos, and images are trademarks
                  or registered trademarks of Code Club AB. All other trademarks are the property of
                  their respective owners.
                </p>
              </div>
            </div>
          </section>

          {/* Game Data */}
          <section className="bg-bg-secondary rounded-xl border border-border p-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                </svg>
              </div>
              <div>
                <h2 className="font-semibold text-text-primary mb-2">Game Data & Content</h2>
                <p className="text-sm text-text-secondary mb-2">
                  The crafting recipes, item data, and other game-related information displayed on this
                  website is sourced from publicly available resources and community contributions.
                </p>
                <p className="text-sm text-text-muted">
                  Found incorrect information?{" "}
                  <Link href="/contact" className="text-accent hover:underline">Contact us</Link>
                </p>
              </div>
            </div>
          </section>

          {/* User Content */}
          <section className="bg-bg-secondary rounded-xl border border-border p-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h2 className="font-semibold text-text-primary mb-2">User-Generated Content</h2>
                <p className="text-sm text-text-secondary mb-2">
                  By submitting content (merchant listings, map locations, etc.), you confirm that:
                </p>
                <ul className="space-y-1 text-sm text-text-muted">
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    You have the right to share this information
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    The information is accurate to the best of your knowledge
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    You are not violating any game rules or terms of service
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* No Warranty */}
          <section className="bg-bg-secondary rounded-xl border border-border p-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="font-semibold text-text-primary mb-2">No Warranty</h2>
                <p className="text-sm text-text-secondary">
                  This website is provided &quot;as is&quot; without any warranties of any kind. We do not warrant
                  that the website will be available at all times, be error-free, or that the information
                  provided is complete or accurate. Use of this website is at your own risk.
                </p>
              </div>
            </div>
          </section>

          {/* Privacy */}
          <section className="bg-bg-secondary rounded-xl border border-border p-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h2 className="font-semibold text-text-primary mb-2">Privacy & Data</h2>
                <p className="text-sm text-text-secondary mb-2">
                  We respect your privacy. When you create an account, we only collect the information
                  necessary to provide our services:
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-bg-tertiary text-text-muted text-xs rounded-full">Username</span>
                  <span className="px-3 py-1 bg-bg-tertiary text-text-muted text-xs rounded-full">Email (for recovery)</span>
                  <span className="px-3 py-1 bg-bg-tertiary text-text-muted text-xs rounded-full">Password (hashed)</span>
                </div>
                <p className="text-sm text-text-muted mt-2">
                  We do not sell or share your personal information with third parties.
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Contact & Navigation */}
        <div className="mt-8 text-center">
          <p className="text-text-muted mb-4">
            Questions about this disclaimer?{" "}
            <Link href="/contact" className="text-accent hover:underline">Contact us</Link>
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-bg-secondary border border-border rounded-xl text-text-primary hover:border-accent/50 hover:text-accent transition-all"
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
