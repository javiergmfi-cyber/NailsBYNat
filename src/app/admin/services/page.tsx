"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/providers/ToastProvider";
import { formatPrice, formatDuration } from "@/lib/utils/dates";
import { CATEGORY_LABELS, type ServiceCategory } from "@/lib/utils/constants";
import type { Service } from "@/types/supabase";

/* ─── Form state ─── */

interface ServiceForm {
  category: ServiceCategory;
  name: string;
  description: string;
  duration_min: string;
  price_dollars: string;
}

const EMPTY_FORM: ServiceForm = {
  category: "nails",
  name: "",
  description: "",
  duration_min: "60",
  price_dollars: "",
};

/* ─── Duration options ─── */
const DURATION_OPTIONS = [
  { value: "15", label: "15 min" },
  { value: "30", label: "30 min" },
  { value: "45", label: "45 min" },
  { value: "60", label: "1 hour" },
  { value: "75", label: "1h 15m" },
  { value: "90", label: "1h 30m" },
  { value: "120", label: "2 hours" },
  { value: "150", label: "2h 30m" },
  { value: "180", label: "3 hours" },
  { value: "240", label: "4 hours" },
];

/* ─── Component ─── */

export default function ServicesPage() {
  const supabase = createClient();
  const { toast } = useToast();

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ServiceForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ServiceForm, string>>>({});

  /* ─── Fetch services ─── */
  const fetchServices = useCallback(async () => {
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      toast("Failed to load services", "error");
      return;
    }

    setServices(data ?? []);
    setLoading(false);
  }, [supabase, toast]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  /* ─── Group services ─── */
  const nailServices = services.filter((s) => s.category === "nails");
  const babysittingServices = services.filter(
    (s) => s.category === "babysitting"
  );

  /* ─── Open modal ─── */
  function openAdd(category: ServiceCategory) {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, category });
    setFormErrors({});
    setModalOpen(true);
  }

  function openEdit(service: Service) {
    setEditingId(service.id);
    setForm({
      category: service.category,
      name: service.name,
      description: service.description || "",
      duration_min: String(service.duration_min),
      price_dollars: String(service.price_cents / 100),
    });
    setFormErrors({});
    setModalOpen(true);
  }

  /* ─── Validate ─── */
  function validate(): boolean {
    const errors: Partial<Record<keyof ServiceForm, string>> = {};
    if (!form.name.trim()) errors.name = "Name is required";
    if (!form.price_dollars || parseFloat(form.price_dollars) <= 0)
      errors.price_dollars = "Enter a valid price";
    if (!form.duration_min || parseInt(form.duration_min) <= 0)
      errors.duration_min = "Select a duration";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  /* ─── Save ─── */
  async function handleSave() {
    if (!validate()) return;
    setSaving(true);

    const payload = {
      category: form.category,
      name: form.name.trim(),
      description: form.description.trim() || null,
      duration_min: parseInt(form.duration_min),
      price_cents: Math.round(parseFloat(form.price_dollars) * 100),
    };

    if (editingId) {
      // Update
      const { error } = await supabase
        .from("services")
        .update({ ...payload, updated_at: new Date().toISOString() } as never)
        .eq("id", editingId);

      if (error) {
        toast("Failed to update service", "error");
        setSaving(false);
        return;
      }
      toast("Service updated!", "success");
    } else {
      // Insert
      const { error } = await supabase.from("services").insert(payload as never);

      if (error) {
        toast("Failed to create service", "error");
        setSaving(false);
        return;
      }
      toast("Service created!", "success");
    }

    setSaving(false);
    setModalOpen(false);
    fetchServices();
  }

  /* ─── Toggle active ─── */
  async function toggleActive(service: Service) {
    setToggling(service.id);

    const { error } = await supabase
      .from("services")
      .update({
        is_active: !service.is_active,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", service.id);

    if (error) {
      toast("Failed to update", "error");
    } else {
      setServices((prev) =>
        prev.map((s) =>
          s.id === service.id ? { ...s, is_active: !s.is_active } : s
        )
      );
      toast(
        service.is_active ? "Service deactivated" : "Service activated",
        "info"
      );
    }

    setToggling(null);
  }

  /* ─── Service card renderer ─── */
  function ServiceCard({ service }: { service: Service }) {
    return (
      <Card padding="md">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-medium text-espresso">{service.name}</h3>
              {!service.is_active && (
                <Badge variant="default">Inactive</Badge>
              )}
            </div>
            {service.description && (
              <p className="mt-1 text-sm text-warm-gray line-clamp-2">
                {service.description}
              </p>
            )}
            <div className="mt-2 flex items-center gap-3 text-sm">
              <span className="font-medium text-espresso">
                {formatPrice(service.price_cents)}
              </span>
              <span className="text-warm-gray/40">&middot;</span>
              <span className="text-warm-gray">
                {formatDuration(service.duration_min)}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            {/* Active toggle */}
            <button
              onClick={() => toggleActive(service)}
              disabled={toggling === service.id}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                service.is_active ? "bg-palm" : "bg-warm-gray/30"
              }`}
              aria-label={
                service.is_active ? "Deactivate service" : "Activate service"
              }
            >
              <motion.div
                className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm"
                animate={{ left: service.is_active ? 21 : 2 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>

            {/* Edit button */}
            <button
              onClick={() => openEdit(service)}
              className="rounded-[var(--radius-sm)] p-1.5 text-warm-gray transition-colors hover:bg-soft-cream hover:text-espresso"
              aria-label="Edit service"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          </div>
        </div>
      </Card>
    );
  }

  /* ─── Section renderer ─── */
  function ServiceSection({
    title,
    category,
    items,
    accent,
  }: {
    title: string;
    category: ServiceCategory;
    items: Service[];
    accent: string;
  }) {
    return (
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-warm-gray">
            <span className={`inline-block h-2 w-2 rounded-full ${accent}`} />
            {title}
            <span className="text-warm-gray/40">{items.length}</span>
          </h2>
          <Button size="sm" variant="ghost" onClick={() => openAdd(category)}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <line x1="7" y1="1" x2="7" y2="13" />
              <line x1="1" y1="7" x2="13" y2="7" />
            </svg>
            Add
          </Button>
        </div>

        {items.length === 0 ? (
          <Card padding="md">
            <p className="text-center text-sm text-warm-gray">
              No {title.toLowerCase()} yet.{" "}
              <button
                onClick={() => openAdd(category)}
                className="font-medium text-coral hover:underline"
              >
                Add your first one
              </button>
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {items.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        )}
      </section>
    );
  }

  /* ─── Render ─── */

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8 pb-8"
    >
      {/* Header */}
      <div>
        <h1 className="font-[family-name:var(--font-playfair)] text-2xl font-semibold text-espresso">
          Services
        </h1>
        <p className="mt-1 text-sm text-warm-gray">
          Manage your service offerings and pricing.
        </p>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 rounded-[var(--radius-lg)] shimmer"
              />
            ))}
          </div>
        </div>
      ) : (
        <>
          <ServiceSection
            title="Nail Services"
            category="nails"
            items={nailServices}
            accent="bg-coral"
          />
          <ServiceSection
            title="Babysitting Services"
            category="babysitting"
            items={babysittingServices}
            accent="bg-palm"
          />
        </>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Edit Service" : "New Service"}
      >
        <div className="space-y-4">
          {/* Category selector */}
          {!editingId && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-warm-gray">
                Category
              </label>
              <div className="flex gap-2">
                {(["nails", "babysitting"] as ServiceCategory[]).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setForm((f) => ({ ...f, category: cat }))}
                    className={`flex-1 rounded-[var(--radius-md)] py-2.5 text-sm font-medium transition-all ${
                      form.category === cat
                        ? cat === "nails"
                          ? "bg-coral/15 text-coral ring-1 ring-coral/30"
                          : "bg-palm/15 text-palm ring-1 ring-palm/30"
                        : "bg-soft-cream/60 text-warm-gray hover:bg-soft-cream"
                    }`}
                  >
                    {CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Name */}
          <Input
            label="Service Name"
            value={form.name}
            onChange={(e) =>
              setForm((f) => ({ ...f, name: e.target.value }))
            }
            error={formErrors.name}
          />

          {/* Description */}
          <Textarea
            label="Description (optional)"
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
          />

          {/* Duration + Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-warm-gray">
                Duration
              </label>
              <select
                value={form.duration_min}
                onChange={(e) =>
                  setForm((f) => ({ ...f, duration_min: e.target.value }))
                }
                className={`w-full rounded-[var(--radius-md)] border bg-white px-3 py-2.5 text-sm text-espresso transition-all focus:outline-none focus:ring-2 focus:ring-coral/30 ${
                  formErrors.duration_min
                    ? "border-terracotta"
                    : "border-gold/20 focus:border-coral/50"
                }`}
                style={{ minHeight: 48 }}
              >
                {DURATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {formErrors.duration_min && (
                <p className="mt-1 text-xs text-terracotta">
                  {formErrors.duration_min}
                </p>
              )}
            </div>

            <Input
              label="Price ($)"
              type="number"
              min="0"
              step="0.01"
              value={form.price_dollars}
              onChange={(e) =>
                setForm((f) => ({ ...f, price_dollars: e.target.value }))
              }
              error={formErrors.price_dollars}
            />
          </div>

          {/* Preview */}
          {form.name && form.price_dollars && (
            <div className="rounded-[var(--radius-md)] bg-soft-cream/60 px-3 py-2 text-sm">
              <span className="font-medium text-espresso">{form.name}</span>
              <span className="mx-1.5 text-warm-gray/40">&middot;</span>
              <span className="text-warm-gray">
                ${parseFloat(form.price_dollars || "0").toFixed(2)}
              </span>
              <span className="mx-1.5 text-warm-gray/40">&middot;</span>
              <span className="text-warm-gray">
                {formatDuration(parseInt(form.duration_min) || 0)}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              variant="ghost"
              onClick={() => setModalOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button loading={saving} onClick={handleSave} className="flex-1">
              {editingId ? "Save Changes" : "Create Service"}
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
