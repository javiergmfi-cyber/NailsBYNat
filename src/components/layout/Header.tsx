"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Header() {
  const pathname = usePathname();
  const isNails = pathname.startsWith("/nails");
  const isBabysitting = pathname.startsWith("/babysitting");

  return (
    <header className="sticky top-0 z-40 border-b border-gold/10 bg-warm-white/80 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4 sm:h-16">
        <Link href="/" className="flex min-h-[44px] items-center gap-2">
          <span className="font-[family-name:var(--font-playfair)] text-xl font-semibold text-espresso">
            Nails by Natalia
          </span>
        </Link>
        <nav className="flex items-center gap-6">
          <Link
            href="/nails"
            className={`flex min-h-[44px] items-center text-base transition-colors sm:text-sm ${isNails ? "text-coral font-medium" : "text-warm-gray hover:text-espresso"}`}
          >
            Nails
          </Link>
          <Link
            href="/babysitting"
            className={`flex min-h-[44px] items-center text-base transition-colors sm:text-sm ${isBabysitting ? "text-palm font-medium" : "text-warm-gray hover:text-espresso"}`}
          >
            Babysitting
          </Link>
        </nav>
      </div>
    </header>
  );
}
