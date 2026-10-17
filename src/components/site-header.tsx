"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./theme";

const NAV = [
  { href: "/", label: "Leaderboard" },
  { href: "/compare/", label: "Compare" },
  { href: "/ceremonies/", label: "Ceremonies" },
  { href: "/about/", label: "About" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" || pathname.startsWith("/groups") : pathname.startsWith(href.replace(/\/$/, ""));

  return (
    <header className="border-b border-line bg-bg">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 px-4 sm:px-6">
        <Link href="/" className="flex items-baseline gap-2 py-3 font-display text-2xl leading-none font-extrabold tracking-tight uppercase">
          Trophy Count
          <span className="hidden font-sans text-xs font-medium tracking-normal text-ink-3 normal-case sm:inline">
            K-pop awards, 2020 to 2026
          </span>
        </Link>
        <nav aria-label="Main" className="order-3 -mx-4 w-[calc(100%+2rem)] border-t border-line sm:order-none sm:mx-0 sm:ml-auto sm:w-auto sm:border-0">
          <ul className="rail flex overflow-x-auto px-2 sm:px-0">
            {NAV.map((item) => (
              <li key={item.href} className="shrink-0">
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={clsx(
                    "relative flex h-11 items-center px-3 text-sm font-medium transition-colors",
                    isActive(item.href)
                      ? "text-ink after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-ink"
                      : "text-ink-2 hover:text-ink",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto sm:ml-0">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
