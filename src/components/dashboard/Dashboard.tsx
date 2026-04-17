"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatPhp } from "@/lib/money";
import { monthLabel, shortDate } from "@/lib/dates";
import { SpendCharts } from "./SpendCharts";
import { AddTransactionModal } from "./AddTransactionModal";

type CategoryRow = {
  id: string;
  name: string;
  color: string;
  icon: string;
  monthly_budget_cents: number;
};

type GoalRow = {
  id: string;
  name: string;
  target_cents: number;
  current_cents: number;
};

type TxRow = {
  id: string;
  amount_cents: number;
  description: string;
  occurred_at: string;
  category_id: string | null;
};

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

function endOfMonth(year: number, month0: number) {
  return new Date(year, month0 + 1, 0);
}

function startOfMonth(year: number, month0: number) {
  return new Date(year, month0, 1);
}

function pctChange(cur: number, prev: number) {
  if (prev === 0) return cur > 0 ? 100 : 0;
  return ((cur - prev) / Math.abs(prev)) * 100;
}

export function Dashboard() {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month0, setMonth0] = useState(() => new Date().getMonth());
  const [modal, setModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const [rangeTx, setRangeTx] = useState<
    { amount_cents: number; occurred_at: string }[]
  >([]);
  const [prevMonthTotals, setPrevMonthTotals] = useState({
    income: 0,
    spent: 0,
  });

  const label = monthLabel(year, month0);

  const load = useCallback(async () => {
    const supabase = createClient();
    setLoading(true);

    const mStart = startOfMonth(year, month0);
    const mEnd = endOfMonth(year, month0);
    const sixStart = startOfMonth(year, month0 - 5);

    const prevStart = startOfMonth(year, month0 - 1);
    const prevEnd = endOfMonth(year, month0 - 1);

    const [
      catRes,
      goalRes,
      txRes,
      rangeRes,
      prevRes,
    ] = await Promise.all([
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("savings_goals").select("*").order("created_at"),
      supabase
        .from("transactions")
        .select("id, amount_cents, description, occurred_at, category_id")
        .gte("occurred_at", iso(mStart))
        .lte("occurred_at", iso(mEnd))
        .order("occurred_at", { ascending: false }),
      supabase
        .from("transactions")
        .select("amount_cents, occurred_at")
        .gte("occurred_at", iso(sixStart))
        .lte("occurred_at", iso(mEnd)),
      supabase
        .from("transactions")
        .select("amount_cents")
        .gte("occurred_at", iso(prevStart))
        .lte("occurred_at", iso(prevEnd)),
    ]);

    if (catRes.data) setCategories(catRes.data as CategoryRow[]);
    if (goalRes.data) setGoals(goalRes.data as GoalRow[]);
    if (txRes.data) setTransactions(txRes.data as TxRow[]);
    if (rangeRes.data)
      setRangeTx(
        rangeRes.data as { amount_cents: number; occurred_at: string }[],
      );

    let pIncome = 0;
    let pSpent = 0;
    if (prevRes.data) {
      for (const t of prevRes.data as { amount_cents: number }[]) {
        if (t.amount_cents > 0) pIncome += t.amount_cents;
        else pSpent += Math.abs(t.amount_cents);
      }
    }
    setPrevMonthTotals({ income: pIncome, spent: pSpent });

    setLoading(false);
  }, [year, month0]);

  useEffect(() => {
    void load();
  }, [load]);

  const metrics = useMemo(() => {
    let income = 0;
    let spent = 0;
    for (const t of transactions) {
      if (t.amount_cents > 0) income += t.amount_cents;
      else spent += Math.abs(t.amount_cents);
    }
    const balance = income - spent;
    const totalSaved = goals.reduce((s, g) => s + g.current_cents, 0);
    const incomePct = pctChange(income, prevMonthTotals.income);
    const spentPct = pctChange(spent, prevMonthTotals.spent);
    return {
      income,
      spent,
      balance,
      totalSaved,
      incomePct,
      spentPct,
      pctOfIncome: income > 0 ? Math.round((balance / income) * 100) : 0,
    };
  }, [transactions, goals, prevMonthTotals]);

  const budgetCategories = useMemo(
    () => categories.filter((c) => c.name !== "Income"),
    [categories],
  );

  const catById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  const spentByCategoryId = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of transactions) {
      if (t.amount_cents >= 0) continue;
      if (!t.category_id) continue;
      const cur = map.get(t.category_id) ?? 0;
      map.set(t.category_id, cur + Math.abs(t.amount_cents));
    }
    return map;
  }, [transactions]);

  const { barLabels, barValues, donutLabels, donutValues, donutColors } =
    useMemo(() => {
      const barLabels: string[] = [];
      const barKeys: { y: number; m: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(year, month0 - i, 1);
        barKeys.push({ y: d.getFullYear(), m: d.getMonth() });
        barLabels.push(d.toLocaleDateString("en-US", { month: "short" }));
      }
      const barValues = barKeys.map(({ y, m }) => {
        let s = 0;
        const ms = iso(startOfMonth(y, m));
        const me = iso(endOfMonth(y, m));
        for (const t of rangeTx) {
          if (t.occurred_at < ms || t.occurred_at > me) continue;
          if (t.amount_cents < 0) s += Math.abs(t.amount_cents);
        }
        return s / 100;
      });

      const donutLabels: string[] = [];
      const donutValues: number[] = [];
      const donutColors: string[] = [];
      for (const c of budgetCategories) {
        const spent = spentByCategoryId.get(c.id) ?? 0;
        if (spent <= 0) continue;
        donutLabels.push(c.name);
        donutValues.push(spent / 100);
        donutColors.push(c.color);
      }

      return {
        barLabels,
        barValues,
        donutLabels,
        donutValues,
        donutColors,
      };
    }, [year, month0, rangeTx, budgetCategories, spentByCategoryId]);

  function changeMonth(dir: number) {
    const d = new Date(year, month0 + dir, 1);
    setYear(d.getFullYear());
    setMonth0(d.getMonth());
  }

  if (loading && categories.length === 0) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-[color:var(--muted)]">
        Loading…
      </div>
    );
  }

  return (
    <>
      <div className="mb-9 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="page-title">
            Budget Overview <span className="text-[color:var(--accent)]">— {label}</span>
          </h1>
          <p className="page-sub mt-1">Track, manage, and grow your finances</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="month-btn"
            onClick={() => changeMonth(-1)}
            aria-label="Previous month"
          >
            ←
          </button>
          <div className="month-display min-w-[120px] text-center">{label}</div>
          <button
            type="button"
            className="month-btn"
            onClick={() => changeMonth(1)}
            aria-label="Next month"
          >
            →
          </button>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="metric-card income">
          <div className="metric-label">Monthly Income</div>
          <div className="metric-value">{formatPhp(metrics.income)}</div>
          <div
            className={`metric-change ${metrics.incomePct >= 0 ? "up" : "down"}`}
          >
            {metrics.incomePct >= 0 ? "↑" : "↓"}{" "}
            {Math.abs(metrics.incomePct).toFixed(1)}% vs last month
          </div>
        </div>
        <div className="metric-card spent">
          <div className="metric-label">Total Spent</div>
          <div className="metric-value">{formatPhp(metrics.spent)}</div>
          <div
            className={`metric-change ${metrics.spentPct <= 0 ? "up" : "down"}`}
          >
            {metrics.spentPct >= 0 ? "↑" : "↓"}{" "}
            {Math.abs(metrics.spentPct).toFixed(1)}% vs last month
          </div>
        </div>
        <div className="metric-card balance">
          <div className="metric-label">Remaining</div>
          <div className="metric-value">{formatPhp(metrics.balance)}</div>
          <div className="metric-change" style={{ color: "var(--muted)" }}>
            {metrics.pctOfIncome}% of income
          </div>
        </div>
        <div className="metric-card saved">
          <div className="metric-label">Total Saved</div>
          <div className="metric-value">{formatPhp(metrics.totalSaved)}</div>
          <div className="metric-change up">Across all goals</div>
        </div>
      </div>

      <SpendCharts
        barLabels={barLabels}
        barValues={barValues}
        donutLabels={donutLabels}
        donutValues={donutValues}
        donutColors={donutColors}
      />

      <div className="mb-7 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="card-title">Budget categories</div>
          <div className="flex flex-col gap-3.5">
            {budgetCategories.map((c) => {
              const spent = spentByCategoryId.get(c.id) ?? 0;
              const pct = Math.min(
                Math.round((spent / Math.max(c.monthly_budget_cents, 1)) * 100),
                100,
              );
              const over = spent > c.monthly_budget_cents;
              return (
                <div key={c.id} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[13.5px]">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: c.color }}
                      />
                      <span>
                        {c.icon} {c.name}
                      </span>
                    </div>
                    <div className="text-xs text-[color:var(--muted)]">
                      <span className="font-medium text-[color:var(--text)]">
                        {formatPhp(spent)}
                      </span>{" "}
                      / {formatPhp(c.monthly_budget_cents)}
                    </div>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        background: over ? "var(--red)" : c.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div className="card-title">Savings goals</div>
          <div className="flex flex-col gap-4">
            {goals.map((g) => {
              const pct = Math.round((g.current_cents / g.target_cents) * 100);
              return (
                <div
                  key={g.id}
                  className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] p-4"
                >
                  <div className="mb-2.5 flex justify-between">
                    <div className="text-[13.5px] font-medium">{g.name}</div>
                    <div className="font-serif text-[13px] text-[color:var(--accent)]">
                      {pct}%
                    </div>
                  </div>
                  <div className="goal-track mb-2">
                    <div
                      className="progress-fill h-full rounded-full bg-gradient-to-r from-[#2fb87a] to-[#3ed9a0]"
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-[color:var(--muted)]">
                    <span>{formatPhp(g.current_cents)}</span>
                    <span>{formatPhp(g.target_cents)} goal</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          Recent transactions
          <span className="badge">
            {transactions.length} this month
          </span>
        </div>
        <div className="flex flex-col">
          {transactions.length === 0 ? (
            <p className="py-6 text-center text-sm text-[color:var(--muted)]">
              No transactions yet. Tap + to add one.
            </p>
          ) : (
            transactions.map((t) => {
              const income = t.amount_cents > 0;
              const cat = t.category_id ? catById.get(t.category_id) : undefined;
              const icon = cat?.icon ?? "💳";
              return (
                <div
                  key={t.id}
                  className="flex items-center gap-3.5 border-b border-[color:var(--border)] py-3 last:border-b-0"
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-base"
                    style={{
                      background: income
                        ? "rgba(62,217,160,0.12)"
                        : "rgba(255,255,255,0.05)",
                    }}
                  >
                    {icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-medium">{t.description}</div>
                    <div className="text-[11.5px] text-[color:var(--muted)]">
                      {cat?.name ?? "Uncategorized"} · {shortDate(t.occurred_at)}
                    </div>
                  </div>
                  <div
                    className={`text-right text-sm font-medium ${
                      income ? "text-[color:var(--accent)]" : "text-[color:var(--text)]"
                    }`}
                  >
                    {income ? "+" : ""}
                    {formatPhp(Math.abs(t.amount_cents))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <button
        type="button"
        className="fab"
        title="Add transaction"
        aria-label="Add transaction"
        onClick={() => setModal(true)}
      >
        +
      </button>

      <AddTransactionModal
        open={modal}
        onClose={() => setModal(false)}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        onSaved={() => void load()}
      />
    </>
  );
}
