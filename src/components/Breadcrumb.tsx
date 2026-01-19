"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import JsonLd from "./JsonLd";
import { generateBreadcrumbSchema, BASE_URL } from "@/lib/seo";

interface BreadcrumbItem {
  name: string;
  href: string;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  className?: string;
}

// Map of path segments to readable names
const PATH_NAMES: Record<string, string> = {
  crafting: "Crafting Calculator",
  cooking: "Cooking & Affinities",
  skills: "Skill Optimizer",
  map: "World Map",
  market: "Marketplace",
  prices: "Price Guide",
  merchants: "Merchants",
  characters: "Characters",
  members: "Members",
  alliances: "Alliances",
  achievements: "Achievements",
  events: "Events",
  timers: "Timer Dashboard",
  treasures: "Treasure Hunting",
  archaeology: "Archaeology",
  resources: "Resources",
  projects: "Projects",
  trades: "Trade Matching",
  analytics: "Analytics",
  recipes: "Recipes",
  submit: "Submit Recipe",
  about: "About",
  contact: "Contact",
  disclaimer: "Disclaimer",
  login: "Login",
  register: "Register",
  dashboard: "Dashboard",
  settings: "Settings",
};

/**
 * Breadcrumb navigation component with JSON-LD structured data
 */
export default function Breadcrumb({ items, className = "" }: BreadcrumbProps) {
  const pathname = usePathname();

  // Generate breadcrumb items from path if not provided
  const breadcrumbItems: BreadcrumbItem[] = items || generateBreadcrumbsFromPath(pathname);

  // Don't show breadcrumb on homepage
  if (breadcrumbItems.length <= 1) {
    return null;
  }

  // Generate schema data
  const schemaItems = breadcrumbItems.map((item) => ({
    name: item.name,
    url: item.href.startsWith("http") ? item.href : `${BASE_URL}${item.href}`,
  }));

  return (
    <>
      <JsonLd data={generateBreadcrumbSchema(schemaItems)} />
      <nav
        aria-label="Breadcrumb"
        className={`text-sm text-text-muted ${className}`}
      >
        <ol className="flex flex-wrap items-center gap-2">
          {breadcrumbItems.map((item, index) => {
            const isLast = index === breadcrumbItems.length - 1;
            return (
              <li key={item.href} className="flex items-center gap-2">
                {index > 0 && (
                  <svg
                    className="w-3 h-3 text-text-muted/50"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                )}
                {isLast ? (
                  <span className="text-text-secondary font-medium" aria-current="page">
                    {item.name}
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    className="hover:text-accent transition-colors"
                  >
                    {item.name}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}

/**
 * Generate breadcrumb items from a pathname
 */
function generateBreadcrumbsFromPath(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean);
  const items: BreadcrumbItem[] = [{ name: "Home", href: "/" }];

  let currentPath = "";
  for (const segment of segments) {
    currentPath += `/${segment}`;

    // Check if this is a dynamic segment (ID)
    const isId = /^\d+$/.test(segment);

    if (isId) {
      // For IDs, use a generic name - the parent component should provide custom items
      items.push({ name: `#${segment}`, href: currentPath });
    } else {
      const name = PATH_NAMES[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
      items.push({ name, href: currentPath });
    }
  }

  return items;
}

/**
 * Export utility function for custom breadcrumb generation
 */
export function createBreadcrumbItems(
  ...items: ({ name: string; href: string } | string)[]
): BreadcrumbItem[] {
  const result: BreadcrumbItem[] = [{ name: "Home", href: "/" }];

  for (const item of items) {
    if (typeof item === "string") {
      const name = PATH_NAMES[item] || item.charAt(0).toUpperCase() + item.slice(1);
      const prevPath = result[result.length - 1]?.href || "";
      result.push({ name, href: `${prevPath}/${item}` });
    } else {
      result.push(item);
    }
  }

  return result;
}
