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
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="glass-panel w-full max-w-lg rounded-[2rem] border border-white/10 p-6"
            initial={{ y: 14, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 14, opacity: 0, scale: 0.96 }}
          >
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
              Confirm Purchase
            </p>
            <h2 className="section-title mt-2 text-3xl text-white">{item.name}</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
              Spend {item.price} coins on this {item.category}. Purchases are saved in your local profile.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/10 px-5 py-3 text-sm text-[var(--color-text-muted)] transition hover:border-white/20 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onConfirm(item.id);
                  onClose();
                }}
                className="rounded-full bg-gradient-to-r from-cyan-400 via-sky-300 to-amber-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]"
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
