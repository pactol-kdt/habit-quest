"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function getFocusable(root: HTMLElement) {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter(
    (node) => !node.hasAttribute("disabled") && node.getAttribute("aria-hidden") !== "true",
  );
}

function focusWithoutScroll(node: HTMLElement) {
  node.focus({ preventScroll: true });
}

/**
 * Focus trap, Escape to close, and body scroll lock for modal dialogs.
 */
export function useDialogA11y(
  panelRef: RefObject<HTMLElement | null>,
  onClose: () => void,
  active = true,
) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!active) {
      return;
    }

    const root = panelRef.current;
    if (!root) {
      return;
    }
    const container: HTMLElement = root;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const scrollY = window.scrollY;
    document.body.style.overflow = "hidden";

    const initial = getFocusable(container);
    // preventScroll avoids jumping the page to the dialog's DOM position
    // (e.g. habit menus rendered below a long list).
    focusWithoutScroll(initial[0] ?? container);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const items = getFocusable(container);
      if (!items.length) {
        event.preventDefault();
        return;
      }

      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        focusWithoutScroll(last);
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        focusWithoutScroll(first);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused) {
        focusWithoutScroll(previouslyFocused);
      }
      // Some browsers still nudge scroll while overflow was locked; restore it.
      if (Math.abs(window.scrollY - scrollY) > 1) {
        window.scrollTo(0, scrollY);
      }
    };
  }, [active, panelRef]);
}
