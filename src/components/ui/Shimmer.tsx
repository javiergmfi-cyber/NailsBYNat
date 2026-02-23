interface ShimmerProps {
  className?: string;
}

export function Shimmer({ className = "" }: ShimmerProps) {
  return (
    <div
      className={`shimmer rounded-[var(--radius-md)] ${className}`}
      aria-hidden="true"
    />
  );
}

export function ShimmerCard() {
  return (
    <div className="glass-card p-5 space-y-3">
      <Shimmer className="h-4 w-2/3" />
      <Shimmer className="h-3 w-1/2" />
      <Shimmer className="h-8 w-1/3 mt-2" />
    </div>
  );
}
