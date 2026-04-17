"use client";

import { useEffect, useState } from "react";
import { addTransaction } from "@/app/actions/transactions";
import { Modal } from "@/components/ui/Modal";

type Cat = { id: string; name: string };

type Props = {
  open: boolean;
  onClose: () => void;
  categories: Cat[];
  onSaved: () => void;
};

export function AddTransactionModal({
  open,
  onClose,
  categories,
  onSaved,
}: Props) {
  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [catId, setCatId] = useState<string>("");
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
    if (categories.length && !catId) {
      const first = categories.find((c) =>
        type === "income" ? c.name === "Income" : c.name !== "Income",
      );
      setCatId(first?.id ?? categories[0].id);
    }
  }, [categories, catId, type, open]);

  async function submit() {
    setErr(null);
    const cleaned = amount.replace(/[^0-9.]/g, "");
    const n = Number.parseFloat(cleaned);
    if (!desc.trim() || Number.isNaN(n) || n <= 0) {
      setErr("Please enter description and a valid amount.");
      return;
    }
    const cents = Math.round(n * 100);
    setPending(true);
    try {
      await addTransaction({
        type,
        amountCents: cents,
        description: desc.trim(),
        categoryId: catId || null,
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

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="add-tx-title"
      panelClassName="max-w-[400px]"
    >
      <h2 id="add-tx-title" className="font-serif text-xl">
        Add Transaction
      </h2>
        {err && (
          <p className="mt-2 text-sm text-[color:var(--red)]">{err}</p>
        )}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div>
            <label className="form-label">Type</label>
            <select
              className="form-input w-full"
              value={type}
              onChange={(e) => {
                setType(e.target.value as "expense" | "income");
                setCatId("");
              }}
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>
          <div>
            <label className="form-label">Amount</label>
            <input
              className="form-input w-full"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="form-label">Description</label>
          <input
            className="form-input w-full"
            type="text"
            placeholder="e.g. Coffee, Rent..."
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
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
      <div className="mt-6 flex justify-end gap-2.5">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={pending}
          onClick={() => void submit()}
        >
          {pending ? "Saving…" : "Add transaction"}
        </button>
      </div>
    </Modal>
  );
}
