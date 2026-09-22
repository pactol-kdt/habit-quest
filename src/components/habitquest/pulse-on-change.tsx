"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "~/lib/ui/cn";

export function PulseOnChange({
  value,
  children,
  className,
}: {
  value: number;
  children: ReactNode;
  className?: string;
}) {
  const previous = useRef(value);
  const [pulseKey, setPulseKey] = useState(0);

  useEffect(() => {
    if (previous.current === value) {
      return;
    }
    previous.current = value;
    setPulseKey((current) => current + 1);
  }, [value]);

  return (
    <motion.span
      key={pulseKey}
      initial={pulseKey === 0 ? false : { scale: 1.18 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 520, damping: 22 }}
      className={cn("inline-flex items-center", className)}
    >
      {children}
    </motion.span>
  );
}
