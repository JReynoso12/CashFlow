"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatPhp, parsePhpToCents } from "@/lib/money";
import {
  contributeToGoal,
  createGoal,
  deleteGoal,
  updateGoal,
  type GoalCadence,
} from "@/app/actions/goals";
import { Modal } from "@/components/ui/Modal";

type GoalRow = {
  id: string;
  name: string;
  target_cents: number;
  current_cents: number;
  cadence: GoalCadence;
  contribution_cents: number;
};

type FormState = {
  id: string | null;
  name: string;
  target: string;
  current: string;
  cadence: GoalCadence;
  contribution: string;
};

const EMPTY_FORM: FormState = {
  id: null,
  name: "",
  target: "",
  current: "",
  cadence: "monthly",
  contribution: "",
};

const CADENCE_OPTIONS: { value: GoalCadence; label: string; short: string }[] =
  [
    { value: "monthly", label: "Monthly", short: "mo" },
    { value: "yearly", label: "Yearly", short: "yr" },
    { value: "one_time", label: "One-time", short: "" },
  ];

function cadenceLabel(c: GoalCadence) {
  return CADENCE_OPTIONS.find((o) => o.value === c)?.label ?? "One-time";
}

function cadenceShort(c: GoalCadence) {
  return CADENCE_OPTIONS.find((o) => o.value === c)?.short ?? "";
}

function formatEta(months: number): string {
  if (!Number.isFinite(months) || months <= 0) return "";
  const rounded = Math.ceil(months);
  if (rounded < 12) {
    return `${rounded} month${rounded === 1 ? "" : "s"}`;
  }
  const years = Math.floor(rounded / 12);
  const rem = rounded % 12;
  if (rem === 0) return `${years} year${years === 1 ? "" : "s"}`;
  return `${years}y ${rem}mo`;
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [contributing, setContributing] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | GoalCadence>("all");

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

  const visible = useMemo(
    () => (filter === "all" ? goals : goals.filter((g) => g.cadence === filter)),
    [goals, filter],
  );

  const totals = useMemo(() => {
    let monthly = 0;
    let yearly = 0;
    let saved = 0;
    let target = 0;
    for (const g of goals) {
      saved += g.current_cents;
      target += g.target_cents;
      if (g.cadence === "monthly") monthly += g.contribution_cents;
      if (g.cadence === "yearly") yearly += g.contribution_cents;
    }
    return { monthly, yearly, saved, target };
  }, [goals]);

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
      cadence: g.cadence,
      contribution:
        g.contribution_cents > 0
          ? (g.contribution_cents / 100).toString()
          : "",
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
    const contribution = form.contribution
      ? parsePhpToCents(form.contribution)
      : 0;
    if (target === null || target <= 0) {
      setErr("Target must be greater than 0.");
      return;
    }
    if (current === null || current < 0) {
      setErr("Saved amount must be 0 or more.");
      return;
    }
    if (contribution === null || contribution < 0) {
      setErr("Contribution must be 0 or more.");
      return;
    }
    if (form.cadence !== "one_time" && contribution <= 0) {
      setErr("Enter a contribution amount for recurring goals.");
      return;
    }
    setPending(true);
    try {
      const payload = {
        name,
        targetCents: target,
        currentCents: current,
        cadence: form.cadence,
        contributionCents: contribution,
      };
      if (form.id) {
        await updateGoal({ id: form.id, ...payload });
      } else {
        await createGoal(payload);
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

  async function contribute(g: GoalRow) {
    if (g.contribution_cents <= 0) {
      alert(
        "Set a contribution amount on this goal first (Edit → Contribution).",
      );
      return;
    }
    setContributing(g.id);
    try {
      await contributeToGoal({ id: g.id, amountCents: g.contribution_cents });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not contribute");
    } finally {
      setContributing(null);
    }
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="page-title mb-2">Savings goals</h1>
          <p className="page-sub">
            Plan monthly or yearly savings and watch them build.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary self-start"
          onClick={openCreate}
        >
          + New goal
        </button>
      </div>

      {goals.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryTile
            label="Monthly plan"
            value={formatPhp(totals.monthly)}
            hint="Across monthly goals"
            accent="var(--accent)"
          />
          <SummaryTile
            label="Yearly plan"
            value={formatPhp(totals.yearly)}
            hint="Across yearly goals"
            accent="var(--blue)"
          />
          <SummaryTile
            label="Total saved"
            value={formatPhp(totals.saved)}
            hint={
              totals.target > 0
                ? `${Math.round((totals.saved / totals.target) * 100)}% of all targets`
                : "No targets yet"
            }
            accent="var(--gold)"
          />
          <SummaryTile
            label="Total target"
            value={formatPhp(totals.target)}
            hint={`${goals.length} goal${goals.length === 1 ? "" : "s"}`}
            accent="var(--accent)"
          />
        </div>
      )}

      {goals.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {[
            { id: "all", label: "All" },
            { id: "monthly", label: "Monthly" },
            { id: "yearly", label: "Yearly" },
            { id: "one_time", label: "One-time" },
          ].map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id as typeof filter)}
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
      )}

      {loading ? (
        <p className="text-[color:var(--muted)]">Loading…</p>
      ) : goals.length === 0 ? (
        <div className="card max-w-xl">
          <p className="text-sm text-[color:var(--muted)]">
            No savings goals yet. Add one to start tracking progress.
          </p>
        </div>
      ) : visible.length === 0 ? (
        <div className="card max-w-xl">
          <p className="text-sm text-[color:var(--muted)]">
            No goals in this view.
          </p>
        </div>
      ) : (
        <div className="grid max-w-xl gap-4">
          {visible.map((g) => {
            const pct = Math.min(
              100,
              Math.round((g.current_cents / g.target_cents) * 100),
            );
            const remaining = Math.max(0, g.target_cents - g.current_cents);
            const periodsLeft =
              g.contribution_cents > 0
                ? remaining / g.contribution_cents
                : Infinity;
            const monthsLeft =
              g.cadence === "monthly"
                ? periodsLeft
                : g.cadence === "yearly"
                  ? periodsLeft * 12
                  : Infinity;
            const eta = formatEta(monthsLeft);
            return (
              <div key={g.id} className="card">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="truncate text-[13.5px] font-medium">
                      {g.name}
                    </span>
                    <CadenceBadge cadence={g.cadence} />
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
                    className="h-full rounded-full bg-gradient-to-r from-[#2fb87a] to-[#3ed9a0] transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-[color:var(--muted)]">
                  <span>{formatPhp(g.current_cents)}</span>
                  <span>{formatPhp(g.target_cents)} goal</span>
                </div>
                {(g.cadence !== "one_time" || g.contribution_cents > 0) && (
                  <div className="mt-4 flex flex-col gap-3 border-t border-[color:var(--border)] pt-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-[12px] text-[color:var(--muted2)]">
                      {g.contribution_cents > 0 ? (
                        <>
                          <span className="font-medium text-[color:var(--text)]">
                            {formatPhp(g.contribution_cents)}
                          </span>
                          {cadenceShort(g.cadence) && (
                            <span> / {cadenceShort(g.cadence)}</span>
                          )}
                          {eta && (
                            <span className="text-[color:var(--muted)]">
                              {" "}
                              · {eta} to go
                            </span>
                          )}
                        </>
                      ) : (
                        <span>No contribution set.</span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost self-start text-[12px] sm:self-auto"
                      disabled={
                        contributing === g.id ||
                        g.contribution_cents <= 0 ||
                        g.current_cents >= g.target_cents
                      }
                      onClick={() => void contribute(g)}
                    >
                      {contributing === g.id
                        ? "Adding…"
                        : g.current_cents >= g.target_cents
                          ? "Completed"
                          : `+ ${formatPhp(g.contribution_cents || 0)}`}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        labelledBy="goal-modal-title"
        panelClassName="max-w-[440px]"
      >
        <h2 id="goal-modal-title" className="font-serif text-xl">
          {form.id ? "Edit goal" : "New goal"}
        </h2>
        {err && <p className="mt-2 text-sm text-[color:var(--red)]">{err}</p>}

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

        <div className="mt-4">
          <label className="form-label">Cadence</label>
          <div className="grid grid-cols-3 gap-2">
            {CADENCE_OPTIONS.map((opt) => {
              const active = form.cadence === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm({ ...form, cadence: opt.value })}
                  className={[
                    "rounded-lg border px-2 py-2 text-[12px] font-medium transition-colors",
                    active
                      ? "border-[color:var(--accent-mid)] bg-[color:var(--accent-dim)] text-[color:var(--accent)]"
                      : "border-[color:var(--border2)] bg-[color:var(--surface2)] text-[color:var(--muted2)] hover:text-[color:var(--text)]",
                  ].join(" ")}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
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
              onChange={(e) => setForm({ ...form, target: e.target.value })}
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
              onChange={(e) => setForm({ ...form, current: e.target.value })}
            />
          </div>
        </div>

        {form.cadence !== "one_time" && (
          <div className="mt-4">
            <label className="form-label">
              Contribution per {form.cadence === "monthly" ? "month" : "year"} (₱)
            </label>
            <input
              className="form-input w-full"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={form.contribution}
              onChange={(e) =>
                setForm({ ...form, contribution: e.target.value })
              }
            />
            <p className="mt-1.5 text-[11px] text-[color:var(--muted)]">
              Tap &quot;+ contribution&quot; on the goal card to add this to
              what you&apos;ve saved.
            </p>
          </div>
        )}

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
      </Modal>
    </div>
  );
}

function CadenceBadge({ cadence }: { cadence: GoalCadence }) {
  const label = cadenceLabel(cadence);
  const cls =
    cadence === "monthly"
      ? "border-[color:var(--accent-mid)] bg-[color:var(--accent-dim)] text-[color:var(--accent)]"
      : cadence === "yearly"
        ? "border-[rgba(91,156,246,0.35)] bg-[rgba(91,156,246,0.12)] text-[color:var(--blue)]"
        : "border-[color:var(--border2)] bg-[color:var(--surface2)] text-[color:var(--muted2)]";
  return (
    <span
      className={[
        "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
        cls,
      ].join(" ")}
    >
      {label}
    </span>
  );
}

function SummaryTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  accent: string;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-[12px] border border-[color:var(--border)] bg-[color:var(--surface)] p-4"
    >
      <div
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{ background: accent }}
      />
      <div className="text-[10px] font-medium uppercase tracking-[1px] text-[color:var(--muted)]">
        {label}
      </div>
      <div
        className="mt-2 font-serif text-[20px] leading-none"
        style={{ color: accent }}
      >
        {value}
      </div>
      <div className="mt-1.5 text-[11px] text-[color:var(--muted)]">{hint}</div>
    </div>
  );
}
