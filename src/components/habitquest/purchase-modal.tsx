"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ShopItem } from "~/types/habitquest";

interface PurchaseModalProps {
  item: ShopItem | null;
  onClose: () => void;
  onConfirm: (itemId: string) => void;
}

export function PurchaseModal({ item, onClose, onConfirm }: PurchaseModalProps) {
  return (
    <AnimatePresence>
      {item ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-0 backdrop-blur-md sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="glass-panel w-full max-w-lg rounded-t-[1.5rem] border border-white/10 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-[2rem] sm:p-6"
            initial={{ y: 14, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 14, opacity: 0, scale: 0.96 }}
          >
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
              Confirm Purchase
            </p>
            <h2 className="section-title mt-2 text-2xl text-white sm:text-3xl">{item.name}</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
              Spend {item.price} coins on this {item.category}. Purchases save to your account.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:flex">
              <button
                type="button"
                onClick={onClose}
                className="min-h-12 rounded-full border border-white/10 px-5 py-3 text-sm text-[var(--color-text-muted)] transition hover:border-white/20 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onConfirm(item.id);
                  onClose();
                }}
                className="min-h-12 rounded-full hq-btn-accent px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]"
              >
                Purchase item
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
