"use client";

import { useEffect, useState } from "react";
import {
  addTransaction,
  type TransactionType,
} from "@/app/actions/transactions";
import { Modal } from "@/components/ui/Modal";
import { MoneyInput } from "@/components/ui/MoneyInput";

type Cat = { id: string; name: string };
type Goal = {
  id: string;
  name: string;
  cadence: "one_time" | "monthly" | "yearly";
};

type Props = {
  open: boolean;
  onClose: () => void;
  categories: Cat[];
  goals: Goal[];
  onSaved: () => void;
};

const TYPE_OPTIONS: { id: TransactionType; label: string }[] = [
  { id: "expense", label: "Expense" },
  { id: "income", label: "Income" },
  { id: "savings", label: "Savings" },
];

function cadenceShort(c: Goal["cadence"]) {
  if (c === "monthly") return "mo";
  if (c === "yearly") return "yr";
  return "one-time";
}

export function AddTransactionModal({
  open,
  onClose,
  categories,
  goals,
  onSaved,
}: Props) {
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [catId, setCatId] = useState<string>("");
  const [goalId, setGoalId] = useState<string>("");
  const [date, setDate] = useState("");
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDate(new Date().toISOString().slice(0, 10));
      setErr(null);
    }
  }, [open]);

  useEffect(() => {
    if (type === "savings") return;
    if (categories.length && !catId) {
      const first = categories.find((c) =>
        type === "income" ? c.name === "Income" : c.name !== "Income",
      );
      setCatId(first?.id ?? categories[0].id);
    }
  }, [categories, catId, type, open]);

  useEffect(() => {
    if (type === "savings" && goals.length && !goalId) {
      setGoalId(goals[0].id);
    }
  }, [type, goals, goalId]);

  async function submit() {
    setErr(null);
    const cleaned = amount.replace(/[^0-9.]/g, "");
    const n = Number.parseFloat(cleaned);
    if (!desc.trim() || Number.isNaN(n) || n <= 0) {
      setErr("Please enter description and a valid amount.");
      return;
    }
    if (type === "savings" && !goalId) {
      setErr("Pick a savings goal.");
      return;
    }
    const cents = Math.round(n * 100);
    setPending(true);
    try {
      await addTransaction({
        type,
        amountCents: cents,
        description: desc.trim(),
        categoryId: type === "savings" ? null : catId || null,
        goalId: type === "savings" ? goalId || null : null,
        occurredAt: date,
      });
      setDesc("");
      setAmount("");
      onSaved();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save");
    } finally {
      setPending(false);
    }
  }

  const primaryLabel =
    type === "savings"
      ? "Add savings"
      : type === "income"
        ? "Add income"
        : "Add expense";

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="add-tx-title"
      panelClassName="max-w-[420px]"
    >
      <h2 id="add-tx-title" className="font-serif text-xl">
        Add Transaction
      </h2>
      {err && <p className="mt-2 text-sm text-[color:var(--red)]">{err}</p>}

      <div className="mt-6">
        <label className="form-label">Type</label>
        <div className="grid grid-cols-3 gap-2">
          {TYPE_OPTIONS.map((opt) => {
            const active = type === opt.id;
            const accent =
              opt.id === "income"
                ? "var(--accent)"
                : opt.id === "savings"
                  ? "var(--blue)"
                  : "var(--red)";
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setType(opt.id)}
                className={[
                  "rounded-lg border px-2 py-2 text-[12.5px] font-medium transition-colors",
                  active
                    ? "text-[color:var(--text)]"
                    : "border-[color:var(--border2)] bg-[color:var(--surface2)] text-[color:var(--muted2)] hover:text-[color:var(--text)]",
                ].join(" ")}
                style={
                  active
                    ? {
                        borderColor: accent,
                        background: `color-mix(in oklab, ${accent} 14%, transparent)`,
                        color: accent,
                      }
                    : undefined
                }
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <label className="form-label">Amount (₱)</label>
          <MoneyInput
            className="form-input w-full"
            placeholder="0.00"
            value={amount}
            onChange={setAmount}
          />
        </div>
        <div>
          <label className="form-label">Date</label>
          <input
            className="form-input w-full"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-4">
        <label className="form-label">Description</label>
        <input
          className="form-input w-full"
          type="text"
          placeholder={
            type === "savings"
              ? "e.g. Payday transfer to savings"
              : "e.g. Coffee, Rent..."
          }
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
      </div>

      {type === "savings" ? (
        <div className="mt-4">
          <label className="form-label">Savings goal</label>
          {goals.length === 0 ? (
            <div className="form-input w-full text-[12px] text-[color:var(--muted)]">
              No goals yet —{" "}
              <a
                href="/goals"
                className="text-[color:var(--accent)] hover:underline"
              >
                create one
              </a>
            </div>
          ) : (
            <select
              className="form-input w-full"
              value={goalId}
              onChange={(e) => setGoalId(e.target.value)}
            >
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} · {cadenceShort(g.cadence)}
                </option>
              ))}
            </select>
          )}
          <p className="mt-1.5 text-[11px] text-[color:var(--muted)]">
            The amount will be added to this goal&apos;s progress, regardless of
            whether it&apos;s monthly, yearly, or one-time.
          </p>
        </div>
      ) : (
        <div className="mt-4">
          <label className="form-label">Category</label>
          {categories.length === 0 ? (
            <div className="form-input w-full text-[12px] text-[color:var(--muted)]">
              None yet —{" "}
              <a
                href="/budgets"
                className="text-[color:var(--accent)] hover:underline"
              >
                add one
              </a>
            </div>
          ) : (
            <select
              className="form-input w-full"
              value={catId}
              onChange={(e) => setCatId(e.target.value)}
            >
              {categories
                .filter((c) =>
                  type === "income"
                    ? c.name === "Income"
                    : c.name !== "Income",
                )
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          )}
        </div>
      )}

      <div className="mt-6 flex justify-end gap-2.5">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={
            pending || (type === "savings" && goals.length === 0) ||
            (type !== "savings" && categories.length === 0 &&
              /* still allow if user wants uncategorized */ false)
          }
          onClick={() => void submit()}
        >
          {pending ? "Saving…" : primaryLabel}
        </button>
      </div>
    </Modal>
  );
}
