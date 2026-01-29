import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-bg-secondary border-t border-border mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded bg-accent flex items-center justify-center">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                </svg>
              </div>
              <span className="text-lg font-semibold text-text-primary">Wurm Tools</span>
            </div>
            <p className="text-sm text-text-muted">
              Community tools for Wurm Online players. Track crafting, find merchants, and connect with alliances.
            </p>
          </div>

          {/* Tools */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-wider">Tools</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/crafting" className="text-sm text-text-muted hover:text-text-primary transition-colors">
                  Crafting Calculator
                </Link>
              </li>
              <li>
                <Link href="/map" className="text-sm text-text-muted hover:text-text-primary transition-colors">
                  World Map
                </Link>
              </li>
              <li>
                <Link href="/merchants" className="text-sm text-text-muted hover:text-text-primary transition-colors">
                  Merchants
                </Link>
              </li>
              <li>
                <Link href="/market" className="text-sm text-text-muted hover:text-text-primary transition-colors">
                  Marketplace
                </Link>
              </li>
            </ul>
          </div>

          {/* Player Hub */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-wider">Player Hub</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/skills" className="text-sm text-text-muted hover:text-text-primary transition-colors">
                  Skill Calculator
                </Link>
              </li>
              <li>
                <Link href="/timers" className="text-sm text-text-muted hover:text-text-primary transition-colors">
                  Timer Dashboard
                </Link>
              </li>
              <li>
                <Link href="/events" className="text-sm text-text-muted hover:text-text-primary transition-colors">
                  Event Calendar
                </Link>
              </li>
              <li>
                <Link href="/alliances" className="text-sm text-text-muted hover:text-text-primary transition-colors">
                  Alliances
                </Link>
              </li>
              <li>
                <Link href="/achievements" className="text-sm text-text-muted hover:text-text-primary transition-colors">
                  Achievements
                </Link>
              </li>
            </ul>
          </div>

          {/* External & Legal */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-wider">Links</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://www.wurmonline.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-text-muted hover:text-text-primary transition-colors inline-flex items-center gap-1"
                >
                  Wurm Online
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </li>
              <li>
                <a
                  href="https://forum.wurmonline.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-text-muted hover:text-text-primary transition-colors inline-flex items-center gap-1"
                >
                  Wurm Forums
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </li>
              <li>
                <a
                  href="https://www.wurmpedia.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-text-muted hover:text-text-primary transition-colors inline-flex items-center gap-1"
                >
                  Wurmpedia
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/Yarpii/WURM-TOOLS"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-text-muted hover:text-text-primary transition-colors inline-flex items-center gap-1"
                >
                  GitHub
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-border">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-text-muted">
              &copy; {currentYear} Wurm Tools. Made with care for the Wurm community.
            </p>
            <div className="flex items-center gap-4 text-sm">
              <Link href="/about" className="text-text-muted hover:text-text-primary transition-colors">
                About
              </Link>
              <Link href="/contact" className="text-text-muted hover:text-text-primary transition-colors">
                Contact
              </Link>
              <Link href="/disclaimer" className="text-text-muted hover:text-text-primary transition-colors">
                Disclaimer
              </Link>
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
