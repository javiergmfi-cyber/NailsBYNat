import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-gold/10 bg-soft-cream/50 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <p className="font-[family-name:var(--font-caveat)] text-lg text-warm-gray">
            Nails by Natalia
          </p>
          <nav className="flex gap-6 text-sm text-warm-gray">
            <Link href="/nails" className="hover:text-espresso transition-colors">
              Nails
            </Link>
            <Link href="/babysitting" className="hover:text-espresso transition-colors">
              Babysitting
            </Link>
          </nav>
        </div>
        <p className="mt-4 text-center text-xs text-warm-gray/60">
          &copy; {new Date().getFullYear()} Nails by Natalia. Palm Beach, FL.
        </p>
      </div>
    </footer>
  );
}
