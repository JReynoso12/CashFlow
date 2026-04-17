"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatPhp } from "@/lib/money";
import { shortDate } from "@/lib/dates";

type CategoryRow = {
  id: string;
  name: string;
  icon: string;
};

type TxRow = {
  id: string;
  amount_cents: number;
  description: string;
  occurred_at: string;
  category_id: string | null;
};

export default function TransactionsPage() {
  const [rows, setRows] = useState<TxRow[]>([]);
  const [cats, setCats] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [tx, c] = await Promise.all([
      supabase
        .from("transactions")
        .select("id, amount_cents, description, occurred_at, category_id")
        .order("occurred_at", { ascending: false })
        .limit(200),
      supabase.from("categories").select("id, name, icon"),
    ]);
    if (tx.data) setRows(tx.data as TxRow[]);
    if (c.data) setCats(c.data as CategoryRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const map = useMemo(
    () => new Map(cats.map((c) => [c.id, c])),
    [cats],
  );

  return (
    <div>
      <h1 className="page-title mb-2">Transactions</h1>
      <p className="page-sub mb-8">All activity, newest first</p>
      {loading ? (
        <p className="text-[color:var(--muted)]">Loading…</p>
      ) : (
        <div className="card">
          <div className="card-title">History</div>
          <div className="flex flex-col">
            {rows.map((t) => {
              const income = t.amount_cents > 0;
              const cat = t.category_id ? map.get(t.category_id) : undefined;
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
                    {cat?.icon ?? "💳"}
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
            })}
          </div>
        </div>
      )}
    </div>
  );
}
