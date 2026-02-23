"use client";

import { motion } from "framer-motion";
import type { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  selected?: boolean;
  padding?: "sm" | "md" | "lg";
}

const paddings = {
  sm: "p-3",
  md: "p-5",
  lg: "p-6",
};

export function Card({
  hoverable = false,
  selected = false,
  padding = "md",
  className = "",
  children,
  ...props
}: CardProps) {
  return (
    <motion.div
      whileHover={hoverable ? { y: -1 } : undefined}
      whileTap={hoverable ? { scale: 0.995 } : undefined}
      transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
      className={`glass-card ${hoverable ? "glass-card-hover cursor-pointer active:scale-[0.995] active:bg-soft-cream/50" : ""} ${selected ? "selected-ring" : ""} ${paddings[padding]} ${className}`}
      {...(props as React.ComponentPropsWithoutRef<typeof motion.div>)}
    >
      {children}
    </motion.div>
  );
}
