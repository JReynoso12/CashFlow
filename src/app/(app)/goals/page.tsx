"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatPhp, parsePhpToCents } from "@/lib/money";
import { createGoal, deleteGoal, updateGoal } from "@/app/actions/goals";

type GoalRow = {
  id: string;
  name: string;
  target_cents: number;
  current_cents: number;
};

type FormState = {
  id: string | null;
  name: string;
  target: string;
  current: string;
};

const EMPTY_FORM: FormState = {
  id: null,
  name: "",
  target: "",
  current: "",
};

export default function GoalsPage() {
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("savings_goals")
      .select("*")
      .order("created_at");
    if (data) setGoals(data as GoalRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setErr(null);
    setOpen(true);
  }

  function openEdit(g: GoalRow) {
    setForm({
      id: g.id,
      name: g.name,
      target: (g.target_cents / 100).toString(),
      current: (g.current_cents / 100).toString(),
    });
    setErr(null);
    setOpen(true);
  }

  async function submit() {
    setErr(null);
    const name = form.name.trim();
    if (!name) {
      setErr("Name is required.");
      return;
    }
    const target = parsePhpToCents(form.target);
    const current = form.current ? parsePhpToCents(form.current) : 0;
    if (target === null || target <= 0) {
      setErr("Target must be greater than 0.");
      return;
    }
    if (current === null || current < 0) {
      setErr("Saved amount must be 0 or more.");
      return;
    }
    setPending(true);
    try {
      if (form.id) {
        await updateGoal({
          id: form.id,
          name,
          targetCents: target,
          currentCents: current,
        });
      } else {
        await createGoal({
          name,
          targetCents: target,
          currentCents: current,
        });
      }
      setOpen(false);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save");
    } finally {
      setPending(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this goal?")) return;
    try {
      await deleteGoal(id);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not delete");
    }
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="page-title mb-2">Savings goals</h1>
          <p className="page-sub">Progress toward your targets</p>
        </div>
        <button
          type="button"
          className="btn btn-primary self-start"
          onClick={openCreate}
        >
          + New goal
        </button>
      </div>

      {loading ? (
        <p className="text-[color:var(--muted)]">Loading…</p>
      ) : goals.length === 0 ? (
        <div className="card max-w-xl">
          <p className="text-sm text-[color:var(--muted)]">
            No savings goals yet. Add one to start tracking progress.
          </p>
        </div>
      ) : (
        <div className="grid max-w-xl gap-4">
          {goals.map((g) => {
            const pct = Math.round((g.current_cents / g.target_cents) * 100);
            return (
              <div key={g.id} className="card">
                <div className="mb-2.5 flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 truncate text-[13.5px] font-medium">
                    {g.name}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="font-serif text-[13px] text-[color:var(--accent)]">
                      {pct}%
                    </div>
                    <button
                      type="button"
                      className="text-[11px] text-[color:var(--muted)] hover:text-[color:var(--text)]"
                      onClick={() => openEdit(g)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-[11px] text-[color:var(--muted)] hover:text-[color:var(--red)]"
                      onClick={() => void remove(g.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="goal-track mb-2">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#2fb87a] to-[#3ed9a0]"
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
      )}

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/70 p-4 sm:p-6"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="modal-pop w-full max-w-[400px] rounded-[14px] border border-[color:var(--border2)] bg-[color:var(--surface)] p-6 sm:p-8">
            <h2 className="font-serif text-xl">
              {form.id ? "Edit goal" : "New goal"}
            </h2>
            {err && (
              <p className="mt-2 text-sm text-[color:var(--red)]">{err}</p>
            )}
            <div className="mt-6">
              <label className="form-label">Name</label>
              <input
                className="form-input w-full"
                type="text"
                placeholder="e.g. Emergency fund"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Target (₱)</label>
                <input
                  className="form-input w-full"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={form.target}
                  onChange={(e) =>
                    setForm({ ...form, target: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="form-label">Saved so far (₱)</label>
                <input
                  className="form-input w-full"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={form.current}
                  onChange={(e) =>
                    setForm({ ...form, current: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={pending}
                onClick={() => void submit()}
              >
                {pending ? "Saving…" : form.id ? "Save" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
