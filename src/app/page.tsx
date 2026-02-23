import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center px-4">
      {/* Wordmark */}
      <div className="mb-12 text-center">
        <h1 className="font-[family-name:var(--font-playfair)] text-4xl font-semibold text-espresso sm:text-5xl">
          Nails by Natalia
        </h1>
        <p className="mt-3 text-warm-gray">
          Palm Beach&apos;s favorite for nails &amp; childcare
        </p>
      </div>

      {/* Service cards */}
      <div className="grid w-full max-w-2xl grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-5">
        {/* Nails card */}
        <Link href="/nails" className="group">
          <div className="glass-card glass-card-hover relative overflow-hidden p-6 text-center transition-all group-hover:selected-ring sm:p-8">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-coral/10">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-coral"
              >
                <path d="M12 3c-1.5 0-3 .5-4 2-1.5 2-2 5-2 7 0 3 2.5 6 6 9 3.5-3 6-6 6-9 0-2-.5-5-2-7-1-1.5-2.5-2-4-2z" />
              </svg>
            </div>
            <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-semibold text-espresso">
              Nails
            </h2>
            <p className="mt-2 text-sm text-warm-gray">
              Manicures, pedicures, acrylics &amp; nail art
            </p>
            <div className="mt-4 inline-flex min-h-[44px] items-center gap-1 text-sm font-medium text-coral">
              Book now
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 3l5 5-5 5" />
              </svg>
            </div>
          </div>
        </Link>

        {/* Babysitting card */}
        <Link href="/babysitting" className="group">
          <div className="glass-card glass-card-hover relative overflow-hidden p-6 text-center transition-all group-hover:selected-ring sm:p-8">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-palm/10">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-palm"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M5 20c0-4 3-7 7-7s7 3 7 7" />
                <circle cx="18" cy="6" r="2.5" />
                <path d="M20.5 14c0-2-1.5-3.5-3.5-3.5" />
              </svg>
            </div>
            <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-semibold text-espresso">
              Babysitting
            </h2>
            <p className="mt-2 text-sm text-warm-gray">
              Trusted, attentive childcare in Palm Beach
            </p>
            <div className="mt-4 inline-flex min-h-[44px] items-center gap-1 text-sm font-medium text-palm">
              Book now
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 3l5 5-5 5" />
              </svg>
            </div>
          </div>
        </Link>
      </div>

      {/* Signature */}
      <p className="mt-12 font-[family-name:var(--font-caveat)] text-lg text-warm-gray/60">
        xo, Natalia
      </p>
    </main>
  );
}
