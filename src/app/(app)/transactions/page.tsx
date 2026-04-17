"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatPhp } from "@/lib/money";
import { shortDate } from "@/lib/dates";
import { deleteTransaction } from "@/app/actions/transactions";

type CategoryRow = {
  id: string;
  name: string;
  icon: string;
};

type GoalRow = {
  id: string;
  name: string;
};

type TxRow = {
  id: string;
  amount_cents: number;
  description: string;
  occurred_at: string;
  category_id: string | null;
  goal_id: string | null;
};

type Filter = "all" | "income" | "expense" | "savings";

export default function TransactionsPage() {
  const [rows, setRows] = useState<TxRow[]>([]);
  const [cats, setCats] = useState<CategoryRow[]>([]);
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [removing, setRemoving] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [tx, c, g] = await Promise.all([
      supabase
        .from("transactions")
        .select("id, amount_cents, description, occurred_at, category_id, goal_id")
        .order("occurred_at", { ascending: false })
        .limit(200),
      supabase.from("categories").select("id, name, icon"),
      supabase.from("savings_goals").select("id, name"),
    ]);
    if (tx.data) setRows(tx.data as TxRow[]);
    if (c.data) setCats(c.data as CategoryRow[]);
    if (g.data) setGoals(g.data as GoalRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const catMap = useMemo(
    () => new Map(cats.map((c) => [c.id, c])),
    [cats],
  );
  const goalMap = useMemo(
    () => new Map(goals.map((g) => [g.id, g])),
    [goals],
  );

  function kindOf(t: TxRow): Filter {
    if (t.goal_id) return "savings";
    return t.amount_cents > 0 ? "income" : "expense";
  }

  const visible = useMemo(
    () => (filter === "all" ? rows : rows.filter((t) => kindOf(t) === filter)),
    [rows, filter],
  );

  async function remove(id: string) {
    if (!confirm("Delete this transaction? Savings transactions will also reverse their goal contribution.")) {
      return;
    }
    setRemoving(id);
    try {
      await deleteTransaction(id);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not delete");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div>
      <h1 className="page-title mb-2">Transactions</h1>
      <p className="page-sub mb-6">All activity, newest first</p>

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            { id: "all", label: "All" },
            { id: "income", label: "Income" },
            { id: "expense", label: "Expense" },
            { id: "savings", label: "Savings" },
          ] as { id: Filter; label: string }[]
        ).map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={[
                "rounded-full border px-3 py-1 text-[12px] transition-colors",
                active
                  ? "border-[color:var(--accent-mid)] bg-[color:var(--accent-dim)] text-[color:var(--accent)]"
                  : "border-[color:var(--border2)] bg-[color:var(--surface2)] text-[color:var(--muted2)] hover:text-[color:var(--text)]",
              ].join(" ")}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="text-[color:var(--muted)]">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="card max-w-xl">
          <p className="text-sm text-[color:var(--muted)]">
            No transactions yet. Tap the + button on the dashboard to add one.
          </p>
        </div>
      ) : visible.length === 0 ? (
        <div className="card max-w-xl">
          <p className="text-sm text-[color:var(--muted)]">
            No transactions match this filter.
          </p>
        </div>
      ) : (
        <div className="card">
          <div className="card-title">
            History
            <span className="badge">{visible.length}</span>
          </div>
          <div className="flex flex-col">
            {visible.map((t) => {
              const kind = kindOf(t);
              const isSavings = kind === "savings";
              const isIncome = kind === "income";
              const cat = t.category_id ? catMap.get(t.category_id) : undefined;
              const goal = t.goal_id ? goalMap.get(t.goal_id) : undefined;
              const icon = isSavings ? "🏦" : (cat?.icon ?? "💳");
              const iconBg = isSavings
                ? "rgba(91,156,246,0.14)"
                : isIncome
                  ? "rgba(62,217,160,0.12)"
                  : "rgba(255,255,255,0.05)";
              const amountColor = isSavings
                ? "text-[color:var(--blue)]"
                : isIncome
                  ? "text-[color:var(--accent)]"
                  : "text-[color:var(--text)]";
              return (
                <div
                  key={t.id}
                  className="flex items-center gap-3.5 border-b border-[color:var(--border)] py-3 last:border-b-0"
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-base"
                    style={{ background: iconBg }}
                  >
                    {icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-medium">
                      {t.description}
                    </div>
                    <div className="truncate text-[11.5px] text-[color:var(--muted)]">
                      {isSavings
                        ? `Savings · ${goal?.name ?? "Goal"}`
                        : (cat?.name ?? "Uncategorized")}{" "}
                      · {shortDate(t.occurred_at)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className={`text-right text-sm font-medium ${amountColor}`}
                    >
                      {isIncome ? "+" : isSavings ? "→" : ""}
                      {formatPhp(Math.abs(t.amount_cents))}
                    </div>
                    <button
                      type="button"
                      className="text-[11px] text-[color:var(--muted)] hover:text-[color:var(--red)]"
                      disabled={removing === t.id}
                      onClick={() => void remove(t.id)}
                      aria-label="Delete transaction"
                    >
                      {removing === t.id ? "…" : "✕"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
