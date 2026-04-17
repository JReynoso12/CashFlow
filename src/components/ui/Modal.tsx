"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  panelClassName?: string;
  labelledBy?: string;
};

export function Modal({
  open,
  onClose,
  children,
  panelClassName,
  labelledBy,
}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-black/70 p-4 sm:p-6"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        paddingTop: "max(1rem, env(safe-area-inset-top))",
        paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={[
          "modal-pop w-full rounded-[14px] border border-[color:var(--border2)] bg-[color:var(--surface)] p-6 sm:p-8",
          panelClassName ?? "max-w-[400px]",
        ].join(" ")}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
