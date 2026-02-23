interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "coral" | "gold" | "palm" | "terracotta";
  className?: string;
}

const variantStyles = {
  default: "bg-soft-cream text-warm-gray",
  coral: "bg-coral/15 text-coral-dark",
  gold: "bg-gold/15 text-gold",
  palm: "bg-palm/15 text-palm",
  terracotta: "bg-terracotta/15 text-terracotta",
};

export function Badge({
  children,
  variant = "default",
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-[var(--radius-full)] px-2.5 py-0.5 text-xs font-medium ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
