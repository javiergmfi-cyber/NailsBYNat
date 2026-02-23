"use client";

import { motion } from "framer-motion";

interface ProgressBarProps {
  progress: number; // 0 to 1
}

export function ProgressBar({ progress }: ProgressBarProps) {
  return (
    <div className="h-1 w-full overflow-hidden bg-soft-cream">
      <motion.div
        className="h-full bg-gradient-to-r from-coral to-coral-light"
        initial={{ width: 0 }}
        animate={{ width: `${progress * 100}%` }}
        transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
      />
    </div>
  );
}
