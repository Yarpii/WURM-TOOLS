"use client";

import Link from "next/link";
import { useSiteSettings } from "./SiteSettingsProvider";

// 1. Fixed header text
const SECTION_TITLES = {
  tools: "Tools",
  playerHub: "Player Hub", 
  links: "Links & External", // Changed from just "Links"
};

// 2. Reusable external link icon component
const ExternalLinkIcon = () => (
  <svg 
    className="w-3 h-3" 
    fill="none" 
    viewBox="0 0 24 24" 
    stroke="currentColor"
    aria-hidden="true"
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth={2} 
      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" 
    />
  </svg>
);

// 3. Extracted link data to constants
const TOOL_LINKS = [
  { href: "/crafting", label: "Crafting Calculator" },
  { href: "/map", label: "World Map" },
  { href: "/merchants", label: "Merchants" },
  { href: "/market", label: "Marketplace" },
];

const PLAYER_HUB_LINKS = [
  { href: "/skills", label: "Skill Calculator" },
  { href: "/timers", label: "Timer Dashboard" },
  { href: "/events", label: "Event Calendar" },
  { href: "/alliances", label: "Alliances" },
  { href: "/achievements", label: "Achievements" },
];

const EXTERNAL_LINKS = [
  { 
    href: "https://www.wurmonline.com/", 
    label: "Wurm Online",
    ariaLabel: "Wurm Online (opens in new tab)"
  },
  { 
    href: "https://forum.wurmonline.com/", 
    label: "Wurm Forums",
    ariaLabel: "Wurm Forums (opens in new tab)"
  },
  { 
    href: "https://www.wurmpedia.com/", 
    label: "Wurmpedia",
    ariaLabel: "Wurmpedia (opens in new tab)"
  },
  { 
    href: "https://github.com/Yarpii/WURM-TOOLS", 
    label: "GitHub",
    ariaLabel: "GitHub repository (opens in new tab)"
  },
];

const BOTTOM_LINKS = [
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/disclaimer", label: "Disclaimer" },
];

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const { settings, footerIcon } = useSiteSettings();

  return (
    <footer className="bg-bg-secondary border-t border-border mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              {footerIcon ? (
                <div className="w-8 h-8 rounded overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={footerIcon} 
                    alt={settings.site_name} 
                    className="w-full h-full object-contain" 
                  />
                </div>
              ) : (
                <div className="w-8 h-8 rounded bg-accent flex items-center justify-center">
                  <svg 
                    className="w-5 h-5 text-white" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2"
                  >
                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                  </svg>
                </div>
              )}
              <span className="text-lg font-semibold text-text-primary">{settings.site_name}</span>
            </div>
            <p className="text-sm text-text-muted">
              {settings.site_tagline || "Community tools for Wurm Online players. Track crafting, find merchants, and connect with alliances."}
            </p>
          </div>

          {/* Tools */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-wider">
              {SECTION_TITLES.tools}
            </h3>
            <ul className="space-y-2">
              {TOOL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link 
                    href={link.href} 
                    className="text-sm text-text-muted hover:text-text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Player Hub */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-wider">
              {SECTION_TITLES.playerHub}
            </h3>
            <ul className="space-y-2">
              {PLAYER_HUB_LINKS.map((link) => (
                <li key={link.href}>
                  <Link 
                    href={link.href} 
                    className="text-sm text-text-muted hover:text-text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* External & Legal */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-wider">
              {SECTION_TITLES.links}
            </h3>
            <ul className="space-y-2">
              {EXTERNAL_LINKS.map((link, index) => {
                // Use settings.social_github for GitHub link if available
                const href = link.label === "GitHub" && settings.social_github 
                  ? settings.social_github 
                  : link.href;
                
                return (
                  <li key={link.href}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={link.ariaLabel}
                      className="text-sm text-text-muted hover:text-text-primary transition-colors inline-flex items-center gap-1"
                    >
                      {link.label}
                      <ExternalLinkIcon />
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-border">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-text-muted">
              &copy; {currentYear} {settings.site_name}. Made with care for the Wurm community.
            </p>
            <div className="flex items-center gap-4 text-sm">
              {BOTTOM_LINKS.map((link) => (
                <Link 
                  key={link.href}
                  href={link.href} 
                  className="text-text-muted hover:text-text-primary transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              <span className="text-xs text-text-muted">
                Not affiliated with Code Club AB
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}