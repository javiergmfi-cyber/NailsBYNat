"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import type { ServiceCategory } from "@/lib/utils/constants";
import type { Service } from "@/types/supabase";
import { formatPrice, formatDuration } from "@/lib/utils/dates";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface ServiceSelectorProps {
  category: ServiceCategory;
  accent: "coral" | "palm";
  selectedService: Service | null;
  onSelect: (service: Service) => void;
  onNext: () => void;
}

function ServiceCardSkeleton() {
  return (
    <div className="shimmer rounded-[var(--radius-lg)] p-5" style={{ height: 100, minHeight: 64 }} />
  );
}

export function ServiceSelector({
  category,
  accent,
  selectedService,
  onSelect,
  onNext,
}: ServiceSelectorProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchServices() {
      const supabase = createClient();
      const { data } = await supabase
        .from("services")
        .select("*")
        .eq("category", category)
        .eq("is_active", true)
        .order("sort_order");

      if (!cancelled && data) {
        setServices(data);
      }
      if (!cancelled) setLoading(false);
    }
    fetchServices();
    return () => {
      cancelled = true;
    };
  }, [category]);

  const badgeVariant = accent === "coral" ? "coral" : "palm";

  return (
    <div className="flex flex-col gap-6 has-bottom-bar">
      {/* Heading */}
      <div>
        <h2 className="font-[family-name:var(--font-playfair)] text-xl font-semibold text-espresso">
          What are we doing today?
        </h2>
        <p className="mt-1 text-sm text-warm-gray">
          {category === "nails"
            ? "Pick your service and let's get you glowing."
            : "Choose the care that fits your family."}
        </p>
      </div>

      {/* Service list */}
      <div className="flex flex-col gap-3">
        {loading ? (
          <>
            <ServiceCardSkeleton />
            <ServiceCardSkeleton />
            <ServiceCardSkeleton />
          </>
        ) : services.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] bg-soft-cream px-6 py-12 text-center">
            <p className="text-warm-gray">
              No services available right now. Check back soon!
            </p>
          </div>
        ) : (
          services.map((service, i) => {
            const isSelected = selectedService?.id === service.id;

            return (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: i * 0.05,
                  duration: 0.3,
                  ease: [0.32, 0.72, 0, 1] as const,
                }}
              >
                <Card
                  hoverable
                  selected={isSelected}
                  padding="md"
                  onClick={() => onSelect(service)}
                  role="button"
                  aria-pressed={isSelected}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(service);
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-espresso">{service.name}</h3>
                        <Badge variant={badgeVariant}>
                          {formatDuration(service.duration_min)}
                        </Badge>
                      </div>
                      {service.description && (
                        <p className="mt-1.5 text-sm text-warm-gray leading-relaxed">
                          {service.description}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 font-[family-name:var(--font-playfair)] text-lg font-semibold text-espresso">
                      {formatPrice(service.price_cents)}
                    </span>
                  </div>

                  {/* Selection indicator */}
                  {isSelected && (
                    <motion.div
                      layoutId="service-check"
                      className={`absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full ${
                        accent === "coral" ? "bg-coral" : "bg-palm"
                      }`}
                      transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] as const }}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                        className="text-white"
                      >
                        <path
                          d="M3 7.5L5.5 10L11 4"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </motion.div>
                  )}
                </Card>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Sticky bottom bar */}
      <div className="mobile-bottom-bar">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-4">
          <div className="min-w-0 flex-1">
            {selectedService ? (
              <p className="truncate text-sm font-medium text-espresso">
                {selectedService.name}
                <span className="text-warm-gray">
                  {" "}
                  &middot; {formatDuration(selectedService.duration_min)} &middot;{" "}
                  {formatPrice(selectedService.price_cents)}
                </span>
              </p>
            ) : (
              <p className="text-sm text-warm-gray">Select a service to continue</p>
            )}
          </div>
          <Button
            variant="primary"
            size="lg"
            disabled={!selectedService}
            onClick={onNext}
            className={`w-full sm:w-auto ${
              accent === "palm"
                ? "bg-palm hover:bg-palm/90 focus-visible:ring-palm/40"
                : ""
            }`}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
