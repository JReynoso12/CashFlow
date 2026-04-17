"use client";

import { forwardRef, useRef } from "react";
import { formatAmountInput } from "@/lib/money";

type Props = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "value" | "type"
> & {
  value: string;
  onChange: (next: string) => void;
};

/**
 * Controlled text input that auto-formats numbers with thousand separators
 * as the user types (e.g. "10000" -> "10,000", "1234.5" -> "1,234.5").
 * Emits the formatted string so the caller can store it directly; the
 * existing parsePhpToCents parser already strips the commas.
 */
export const MoneyInput = forwardRef<HTMLInputElement, Props>(
  function MoneyInput({ value, onChange, onBlur, ...rest }, ref) {
    const innerRef = useRef<HTMLInputElement | null>(null);

    function setRefs(el: HTMLInputElement | null) {
      innerRef.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    }

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const el = e.target;
      const raw = el.value;
      const prevCursor = el.selectionStart ?? raw.length;

      // Count the number of "meaningful" chars (digits + dot) up to cursor so
      // we can place the cursor after the same count post-format.
      const meaningfulBefore = raw
        .slice(0, prevCursor)
        .replace(/[^0-9.]/g, "").length;

      const formatted = formatAmountInput(raw);
      onChange(formatted);

      requestAnimationFrame(() => {
        const input = innerRef.current;
        if (!input) return;
        let count = 0;
        let newPos = formatted.length;
        for (let i = 0; i < formatted.length; i++) {
          if (/[0-9.]/.test(formatted[i]!)) count++;
          if (count === meaningfulBefore) {
            newPos = i + 1;
            break;
          }
        }
        try {
          input.setSelectionRange(newPos, newPos);
        } catch {
          /* some input types (iOS date) don't allow this; ignore */
        }
      });
    }

    function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
      // Reformat on blur to clean up trailing dots like "1,234."
      const formatted = formatAmountInput(e.target.value.replace(/\.$/, ""));
      if (formatted !== e.target.value) onChange(formatted);
      onBlur?.(e);
    }

    return (
      <input
        ref={setRefs}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        {...rest}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
      />
    );
  },
);
