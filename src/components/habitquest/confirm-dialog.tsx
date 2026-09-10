"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useDialogA11y } from "~/hooks/use-dialog-a11y";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}

export function ConfirmDialog({
  open,
  title,
  description,
  onClose,
  children,
}: ConfirmDialogProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  // Portal to body so position:fixed is viewport-relative.
  // Ancestors like .glass-panel (backdrop-filter) or overflow-hidden
  // otherwise trap fixed dialogs inside the card.
  return createPortal(
    <AnimatePresence>
      {open ? (
        <ConfirmDialogPanel
          title={title}
          description={description}
          onClose={onClose}
        >
          {children}
        </ConfirmDialogPanel>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

function ConfirmDialogPanel({
  title,
  description,
  onClose,
  children,
}: Omit<ConfirmDialogProps, "open">) {
  const panelRef = useRef<HTMLDivElement>(null);
  useDialogA11y(panelRef, onClose);

  return (
    <motion.div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/70 p-0 backdrop-blur-md sm:items-center sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        tabIndex={-1}
        className="glass-panel w-full max-w-md rounded-t-[1.5rem] border border-white/10 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] outline-none sm:rounded-[1.75rem] sm:p-6"
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 12, opacity: 0 }}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" className="section-title text-2xl text-white">
          {title}
        </h2>
        {description ? (
          <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">{description}</p>
        ) : null}
        <div className="mt-6 grid gap-2 sm:flex sm:flex-wrap sm:justify-end">{children}</div>
      </motion.div>
    </motion.div>
  );
}
