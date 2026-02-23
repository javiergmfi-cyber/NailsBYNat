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

export default function NailsPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function fetchServices() {
      const { data } = await supabase
        .from("services")
        .select("*")
        .eq("category", "nails")
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
        <p className="mb-3 font-[family-name:var(--font-caveat)] text-lg text-coral">
          Welcome to
        </p>
        <h1 className="font-[family-name:var(--font-playfair)] text-4xl font-semibold text-espresso sm:text-5xl lg:text-6xl">
          Nails by Natalia
        </h1>
        <p className="mx-auto mt-4 max-w-md text-lg text-warm-gray">
          Your nails, perfected.
        </p>
        <div className="mx-auto mt-3 h-px w-16 bg-coral/30" />
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
            {[...Array(4)].map((_, i) => (
              <div key={i} className="shimmer h-40 min-h-[120px] rounded-[var(--radius-lg)]" />
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
                    <Badge variant="coral">
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
            Ready to treat yourself?
          </h2>
          <p className="mt-2 text-warm-gray">
            Pick your service, choose a time, and you&apos;re all set.
          </p>
          <Link href="/nails/book" className="mt-6 block sm:inline-block">
            <Button size="lg" className="w-full sm:w-auto">Book Your Appointment</Button>
          </Link>
        </div>
        <p className="mt-8 font-[family-name:var(--font-caveat)] text-lg text-warm-gray/60">
          xo, Natalia
        </p>
      </motion.section>
    </div>
  );
}
