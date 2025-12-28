import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-dark-card border-t border-gold/10 mt-auto">
      {/* Decorative top border */}
      <div className="forge-divider" />

      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              {/* Small anvil icon */}
              <svg
                className="w-8 h-8 text-accent"
                viewBox="0 0 64 64"
                fill="currentColor"
              >
                <path d="M8 38 L12 28 L52 28 L56 38 L56 42 L8 42 Z" />
                <path d="M16 42 L16 52 L48 52 L48 42" />
                <path d="M20 52 L20 56 L44 56 L44 52" />
                <path d="M4 32 L12 28 L12 38 L8 38 L4 36 Z" />
              </svg>
              <h2 className="text-xl font-bold tracking-wide">
                <span className="text-accent">BLACK</span>
                <span className="text-gold">FORGE</span>
                <span className="text-gray-600 text-sm">.tools</span>
              </h2>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed max-w-md">
              Forged in the fires of necessity, Blackforge.Tools provides essential utilities
              for Wurm Online adventurers. Calculate your crafting materials, manage recipes,
              and master the art of creation.
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs text-gray-600">
              <span className="text-gold/50">◆</span>
              <span>Crafted for the Wurm community</span>
              <span className="text-gold/50">◆</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-gold font-semibold mb-4 text-sm uppercase tracking-wider">
              Forge Tools
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-gray-400 hover:text-accent transition-colors text-sm flex items-center gap-2">
                  <span className="text-accent/50">›</span>
                  Crafting Calculator
                </Link>
              </li>
              <li>
                <Link href="/data" className="text-gray-400 hover:text-accent transition-colors text-sm flex items-center gap-2">
                  <span className="text-accent/50">›</span>
                  Data Management
                </Link>
              </li>
              <li>
                <Link href="/admin" className="text-gray-400 hover:text-accent transition-colors text-sm flex items-center gap-2">
                  <span className="text-accent/50">›</span>
                  Admin Panel
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-gold font-semibold mb-4 text-sm uppercase tracking-wider">
              Resources
            </h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://www.wurmonline.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-accent transition-colors text-sm flex items-center gap-2"
                >
                  <span className="text-accent/50">›</span>
                  Wurm Online
                  <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </li>
              <li>
                <a
                  href="https://www.wurmpedia.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-accent transition-colors text-sm flex items-center gap-2"
                >
                  <span className="text-accent/50">›</span>
                  Wurmpedia
                  <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/Yarpii/WURM-TOOLS"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-accent transition-colors text-sm flex items-center gap-2"
                >
                  <span className="text-accent/50">›</span>
                  GitHub
                  <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 pt-6 border-t border-gold/10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-600 text-sm">
              &copy; {currentYear} Blackforge.Tools — Not affiliated with Code Club AB
            </p>
            <div className="flex items-center gap-4 text-xs text-gray-700">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4 text-accent/50" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                </svg>
                Forged with fire
              </span>
              <span className="text-gold/30">|</span>
              <span>For the Wurm community</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
