"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Goal = {
  id: string;
  name: string;
  cadence: "one_time" | "monthly" | "yearly";
  contribution_cents: number;
};

type Tx = {
  goal_id: string | null;
  occurred_at: string;
};

type Props = {
  goals: Goal[];
  transactions: Tx[];
  year: number;
  month0: number;
};

function isoMonthKey(year: number, month0: number) {
  return `${year}-${String(month0 + 1).padStart(2, "0")}`;
}

export function SavingsReminder({ goals, transactions, year, month0 }: Props) {
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const key = isoMonthKey(year, month0);
  const storageKey = "cashflow.savings-reminder.dismissed";

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(storageKey));
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  function dismiss() {
    setDismissed(key);
    try {
      window.localStorage.setItem(storageKey, key);
    } catch {
      /* ignore */
    }
  }

  const monthStart = `${key}-01`;
  const monthlyGoals = goals.filter(
    (g) => g.cadence === "monthly" && g.contribution_cents > 0,
  );
  if (monthlyGoals.length === 0) return null;

  const fundedIds = new Set(
    transactions
      .filter((t) => t.goal_id && t.occurred_at >= monthStart)
      .map((t) => t.goal_id as string),
  );

  const unfunded = monthlyGoals.filter((g) => !fundedIds.has(g.id));
  if (unfunded.length === 0) return null;
  if (!hydrated) return null;
  if (dismissed === key) return null;

  const names = unfunded.slice(0, 2).map((g) => g.name).join(", ");
  const more = unfunded.length > 2 ? ` +${unfunded.length - 2} more` : "";

  return (
    <div
      className="mb-6 flex flex-col gap-3 rounded-[12px] border p-4 sm:flex-row sm:items-center sm:justify-between"
      style={{
        borderColor: "var(--accent-mid)",
        background:
          "linear-gradient(180deg, rgba(62,217,160,0.10), rgba(62,217,160,0.04))",
      }}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-base"
          style={{ background: "rgba(62,217,160,0.18)" }}
        >
          💡
        </div>
        <div className="min-w-0">
          <div className="text-[13.5px] font-medium">
            You haven&apos;t funded{" "}
            {unfunded.length === 1 ? "a monthly goal" : "some monthly goals"}{" "}
            yet this month
          </div>
          <div className="mt-0.5 truncate text-[12px] text-[color:var(--muted2)]">
            {names}
            {more}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <Link href="/goals" className="btn btn-primary text-[12.5px]">
          Review goals
        </Link>
        <button
          type="button"
          className="btn btn-ghost text-[12.5px]"
          onClick={dismiss}
          aria-label="Dismiss reminder"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
