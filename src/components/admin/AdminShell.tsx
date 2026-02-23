"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

const NAV_ITEMS = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: (active: boolean) => (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={active ? 2 : 1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    label: "Availability",
    href: "/admin/availability",
    icon: (active: boolean) => (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={active ? 2 : 1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    label: "Bookings",
    href: "/admin/bookings",
    icon: (active: boolean) => (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={active ? 2 : 1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
      </svg>
    ),
  },
  {
    label: "Services",
    href: "/admin/services",
    icon: (active: boolean) => (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={active ? 2 : 1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
        <line x1="7" y1="7" x2="7.01" y2="7" />
      </svg>
    ),
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname.startsWith(href);
}

export function AdminShell({
  userEmail,
  children,
}: {
  userEmail: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  return (
    <div className="flex min-h-dvh bg-warm-white">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 md:left-0 md:z-30 md:border-r md:border-gold/10 md:bg-white/60 md:backdrop-blur-md">
        {/* Logo area */}
        <Link
          href="/admin"
          className="flex items-center gap-3 border-b border-gold/10 px-6 py-5"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-coral/10">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-coral"
            >
              <path d="M12 3c-1.5 0-3 .5-4 2-1.5 2-2 5-2 7 0 3 2.5 6 6 9 3.5-3 6-6 6-9 0-2-.5-5-2-7-1-1.5-2.5-2-4-2z" />
            </svg>
          </div>
          <div>
            <p className="font-[family-name:var(--font-playfair)] text-sm font-semibold text-espresso">
              Nails by Natalia
            </p>
            <p className="text-[11px] text-warm-gray">Admin</p>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4">
          <ul className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`relative flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? "text-coral"
                        : "text-warm-gray hover:text-espresso hover:bg-soft-cream/60"
                    }`}
                  >
                    {active && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute inset-0 rounded-[var(--radius-md)] bg-coral/8"
                        transition={{
                          type: "spring",
                          stiffness: 350,
                          damping: 30,
                        }}
                      />
                    )}
                    <span className="relative z-10">
                      {item.icon(active)}
                    </span>
                    <span className="relative z-10">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User section */}
        <div className="border-t border-gold/10 px-4 py-4">
          <p
            className="truncate text-xs text-warm-gray"
            title={userEmail}
          >
            {userEmail}
          </p>
          <button
            onClick={handleSignOut}
            className="mt-2 text-xs font-medium text-warm-gray transition-colors hover:text-terracotta"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col md:pl-60">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-gold/10 bg-white/80 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-md md:hidden">
          <Link
            href="/admin"
            className="flex min-h-[52px] items-center font-[family-name:var(--font-playfair)] text-base font-semibold text-espresso"
          >
            Nails by Natalia
          </Link>
          <button
            onClick={handleSignOut}
            className="flex min-h-[44px] items-center rounded-[var(--radius-sm)] px-3 text-sm font-medium text-warm-gray transition-colors active:bg-soft-cream hover:bg-soft-cream hover:text-espresso"
          >
            Sign out
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">{children}</div>
        </main>

        {/* Mobile bottom nav */}
        <nav
          className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-gold/10 bg-white/92 backdrop-blur-md md:hidden"
          style={{ paddingBottom: "max(0.25rem, env(safe-area-inset-bottom))" }}
        >
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex flex-1 flex-col items-center gap-0.5 pb-1 pt-2 text-xs font-medium transition-colors ${
                  active ? "text-coral" : "text-warm-gray"
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="tab-active"
                    className="absolute -top-px left-3 right-3 h-0.5 rounded-full bg-coral"
                    transition={{
                      type: "spring",
                      stiffness: 350,
                      damping: 30,
                    }}
                  />
                )}
                {item.icon(active)}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Spacer for mobile bottom nav (with safe area) */}
        <div className="md:hidden" style={{ height: "calc(4rem + env(safe-area-inset-bottom, 0px))" }} />
      </div>
    </div>
  );
}
