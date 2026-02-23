"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatPrice, formatDuration } from "@/lib/utils/dates";
import type { Service } from "@/types/supabase";

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
};

const trustSignals = [
  {
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 12l2 2 4-4" />
        <path d="M12 3c-1.2 0-2.4.6-3 1.7A3.6 3.6 0 004.6 9c-1 1.2-1.1 2.9-.2 4.2A3.6 3.6 0 006 18.3c1.2.7 2.7.7 3.9 0L12 17l2.1 1.3c1.2.7 2.7.7 3.9 0a3.6 3.6 0 001.6-5.1c.9-1.3.8-3-.2-4.2A3.6 3.6 0 0015 4.7C14.4 3.6 13.2 3 12 3z" />
      </svg>
    ),
    title: "CPR Certified",
    description: "Trained and certified in infant and child CPR",
  },
  {
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
    title: "Background Checked",
    description: "Fully vetted with a clean background check",
  },
  {
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16.5 12" />
      </svg>
    ),
    title: "5+ Years Experience",
    description: "Trusted by Palm Beach families since 2020",
  },
];

export default function BabysittingPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function fetchServices() {
      const { data } = await supabase
        .from("services")
        .select("*")
        .eq("category", "babysitting")
        .eq("is_active", true)
        .order("sort_order");

      if (data) setServices(data);
      setLoading(false);
    }

    fetchServices();
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:py-20">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] as const }}
        className="mb-12 text-center sm:mb-16"
      >
        <p className="mb-3 font-[family-name:var(--font-caveat)] text-lg text-palm">
          Care you can count on
        </p>
        <h1 className="font-[family-name:var(--font-playfair)] text-4xl font-semibold text-espresso sm:text-5xl lg:text-6xl">
          Childcare by Natalia
        </h1>
        <p className="mx-auto mt-4 max-w-md text-lg text-warm-gray">
          Trusted care for your little ones.
        </p>
        <div className="mx-auto mt-3 h-px w-16 bg-palm/30" />
      </motion.section>

      {/* Trust Signals */}
      <motion.section
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="mb-12 grid gap-4 sm:mb-16 sm:grid-cols-3"
      >
        {trustSignals.map((signal) => (
          <motion.div
            key={signal.title}
            variants={fadeInUp}
            transition={{
              duration: 0.5,
              ease: [0.32, 0.72, 0, 1] as const,
            }}
          >
            <Card padding="lg" className="text-center">
              <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-palm/10 text-palm">
                {signal.icon}
              </div>
              <h3 className="font-[family-name:var(--font-playfair)] text-base font-semibold text-espresso">
                {signal.title}
              </h3>
              <p className="mt-1 text-sm text-warm-gray">
                {signal.description}
              </p>
            </Card>
          </motion.div>
        ))}
      </motion.section>

      {/* Services */}
      <section className="mb-12 sm:mb-16">
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mb-8 text-center font-[family-name:var(--font-playfair)] text-2xl font-semibold text-espresso"
        >
          Services
        </motion.h2>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="shimmer h-40 rounded-[var(--radius-lg)]" />
            ))}
          </div>
        ) : services.length === 0 ? (
          <p className="text-center text-warm-gray">
            Services are being updated. Check back soon!
          </p>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid gap-4 sm:grid-cols-2"
          >
            {services.map((service) => (
              <motion.div
                key={service.id}
                variants={fadeInUp}
                transition={{
                  duration: 0.5,
                  ease: [0.32, 0.72, 0, 1] as const,
                }}
              >
                <Card hoverable padding="lg" className="flex h-full min-h-[120px] flex-col">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <h3 className="font-[family-name:var(--font-playfair)] text-lg font-semibold text-espresso">
                      {service.name}
                    </h3>
                    <Badge variant="palm">
                      {formatDuration(service.duration_min)}
                    </Badge>
                  </div>
                  {service.description && (
                    <p className="mb-4 flex-1 text-sm leading-relaxed text-warm-gray">
                      {service.description}
                    </p>
                  )}
                  <p className="mt-auto font-[family-name:var(--font-playfair)] text-xl font-semibold text-espresso">
                    {formatPrice(service.price_cents)}
                  </p>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>

      {/* CTA */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5, ease: [0.32, 0.72, 0, 1] as const }}
        className="text-center"
      >
        <div className="glass-card mx-auto max-w-lg p-8 sm:p-10">
          <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-semibold text-espresso">
            Book trusted care today
          </h2>
          <p className="mt-2 text-warm-gray">
            Choose a service and time that works for your family.
          </p>
          <Link href="/babysitting/book" className="mt-6 block sm:inline-block">
            <Button
              size="lg"
              className="w-full !bg-palm text-white hover:!bg-palm/90 sm:w-auto"
            >
              Book Babysitting
            </Button>
          </Link>
        </div>
        <p className="mt-8 font-[family-name:var(--font-caveat)] text-lg text-warm-gray/60">
          xo, Natalia
        </p>
      </motion.section>
    </div>
  );
}
