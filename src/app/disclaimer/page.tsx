"use client";

import Link from "next/link";

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-bg-primary py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-text-primary mb-8">Disclaimer & Legal Notice</h1>

        {/* Not Affiliated */}
        <section className="bg-bg-secondary rounded-lg border border-border p-6 mb-6">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Not Affiliated with Wurm Online</h2>
          <p className="text-text-secondary mb-4">
            Wurm Tools is an independent, fan-made project created by and for the Wurm Online community.
            This website is <strong className="text-text-primary">NOT</strong> affiliated with, endorsed by,
            or in any way officially connected with:
          </p>
          <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
            <li>Code Club AB</li>
            <li>Wurm Online</li>
            <li>Wurm Unlimited</li>
            <li>Any of their subsidiaries or affiliates</li>
          </ul>
          <p className="text-text-secondary mt-4">
            The official Wurm Online website can be found at{" "}
            <a
              href="https://www.wurmonline.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              wurmonline.com
            </a>.
          </p>
        </section>

        {/* Trademarks */}
        <section className="bg-bg-secondary rounded-lg border border-border p-6 mb-6">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Trademarks</h2>
          <p className="text-text-secondary">
            Wurm Online, Wurm Unlimited, and all related names, logos, and images are trademarks
            or registered trademarks of Code Club AB. All other trademarks are the property of
            their respective owners. The use of any trade name or trademark is for identification
            and reference purposes only and does not imply any association with the trademark holder.
          </p>
        </section>

        {/* Game Data */}
        <section className="bg-bg-secondary rounded-lg border border-border p-6 mb-6">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Game Data & Content</h2>
          <p className="text-text-secondary mb-4">
            The crafting recipes, item data, and other game-related information displayed on this
            website is sourced from publicly available resources and community contributions. We
            strive for accuracy but cannot guarantee that all information is up-to-date or correct.
          </p>
          <p className="text-text-secondary">
            If you notice any incorrect information, please contact us through the{" "}
            <Link href="/contact" className="text-accent hover:underline">contact page</Link>.
          </p>
        </section>

        {/* User Content */}
        <section className="bg-bg-secondary rounded-lg border border-border p-6 mb-6">
          <h2 className="text-xl font-semibold text-text-primary mb-4">User-Generated Content</h2>
          <p className="text-text-secondary mb-4">
            Users may submit content such as merchant listings, map locations, and alliance
            information. By submitting content, you confirm that:
          </p>
          <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
            <li>You have the right to share this information</li>
            <li>The information is accurate to the best of your knowledge</li>
            <li>You are not violating any game rules or terms of service</li>
          </ul>
          <p className="text-text-secondary mt-4">
            We reserve the right to remove any content that violates our guidelines or is
            reported as inaccurate.
          </p>
        </section>

        {/* No Warranty */}
        <section className="bg-bg-secondary rounded-lg border border-border p-6 mb-6">
          <h2 className="text-xl font-semibold text-text-primary mb-4">No Warranty</h2>
          <p className="text-text-secondary">
            This website is provided &quot;as is&quot; without any warranties of any kind, either express
            or implied. We do not warrant that the website will be available at all times, be
            error-free, or that the information provided is complete or accurate. Use of this
            website is at your own risk.
          </p>
        </section>

        {/* Privacy */}
        <section className="bg-bg-secondary rounded-lg border border-border p-6 mb-6">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Privacy & Data</h2>
          <p className="text-text-secondary mb-4">
            We respect your privacy. When you create an account, we only collect the information
            necessary to provide our services:
          </p>
          <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
            <li>Username (for display purposes)</li>
            <li>Email address (for account recovery and notifications)</li>
            <li>Password (securely hashed, never stored in plain text)</li>
          </ul>
          <p className="text-text-secondary mt-4">
            We do not sell or share your personal information with third parties.
          </p>
        </section>

        {/* Contact */}
        <section className="bg-bg-secondary rounded-lg border border-border p-6 mb-6">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Contact</h2>
          <p className="text-text-secondary">
            If you have any questions about this disclaimer or want to report an issue,
            please visit the{" "}
            <Link
              href="/contact"
              className="text-accent hover:underline"
            >
              contact page
            </Link>{" "}
            or send a message to Yarpiii in-game.
          </p>
        </section>

        {/* Back Link */}
        <div className="text-center mt-8">
          <Link
            href="/"
            className="text-accent hover:underline"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
