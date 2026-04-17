"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatAmountInput, formatPhp, parsePhpToCents } from "@/lib/money";
import {
  addDefaultCategories,
  createCategory,
  deleteCategory,
  updateCategory,
} from "@/app/actions/categories";
import { Modal } from "@/components/ui/Modal";
import { MoneyInput } from "@/components/ui/MoneyInput";

type CategoryRow = {
  id: string;
  name: string;
  color: string;
  icon: string;
  monthly_budget_cents: number;
  sort_order: number;
};

const PRESET_COLORS = [
  "#3ed9a0",
  "#5b9cf6",
  "#f5c842",
  "#d46fd4",
  "#f2956c",
  "#a0e26a",
  "#8899aa",
  "#f27059",
];

const PRESET_ICONS = [
  "💳",
  "🏠",
  "🍽️",
  "🚗",
  "🎬",
  "⚡",
  "💊",
  "💸",
  "🛒",
  "📚",
  "✈️",
  "🎁",
];

type FormState = {
  id: string | null;
  name: string;
  icon: string;
  color: string;
  amount: string;
};

const EMPTY_FORM: FormState = {
  id: null,
  name: "",
  icon: "💳",
  color: "#3ed9a0",
  amount: "",
};

export default function BudgetsPage() {
  const [rows, setRows] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("categories")
      .select("*")
      .order("sort_order");
    if (data) setRows(data as CategoryRow[]);
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

  function openEdit(c: CategoryRow) {
    setForm({
      id: c.id,
      name: c.name,
      icon: c.icon,
      color: c.color,
      amount:
        c.monthly_budget_cents > 0
          ? formatAmountInput((c.monthly_budget_cents / 100).toString())
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
    const cents = form.amount ? parsePhpToCents(form.amount) : 0;
    if (cents === null || cents < 0) {
      setErr("Enter a valid budget amount.");
      return;
    }
    setPending(true);
    try {
      if (form.id) {
        await updateCategory({
          id: form.id,
          name,
          icon: form.icon,
          color: form.color,
          monthlyBudgetCents: cents,
        });
      } else {
        await createCategory({
          name,
          icon: form.icon,
          color: form.color,
          monthlyBudgetCents: cents,
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

  async function addDefaults() {
    try {
      const added = await addDefaultCategories();
      if (added === 0) {
        alert("You already have all the default categories.");
      }
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not add defaults");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this category? Transactions will be uncategorized.")) {
      return;
    }
    try {
      await deleteCategory(id);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not delete");
    }
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="page-title mb-2">Budgets</h1>
          <p className="page-sub max-w-lg">
            Create categories and set a monthly budget for each.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => void addDefaults()}
          >
            Use defaults
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={openCreate}
          >
            + New category
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-[color:var(--muted)]">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="card max-w-xl">
          <p className="text-sm text-[color:var(--muted)]">
            You don&apos;t have any categories yet. Tap{" "}
            <span className="font-medium text-[color:var(--text)]">
              Use defaults
            </span>{" "}
            to load the standard set (Housing, Food &amp; Dining,
            Transportation, Entertainment, Utilities, Healthcare, Income,
            Other) or{" "}
            <span className="font-medium text-[color:var(--text)]">
              + New category
            </span>{" "}
            to create your own.
          </p>
        </div>
      ) : (
        <div className="grid max-w-3xl gap-3">
          {rows.map((c) => (
            <div
              key={c.id}
              className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] text-lg"
                  style={{ background: `${c.color}22` }}
                >
                  {c.icon}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-medium">
                    {c.name}
                  </div>
                  <div className="text-[12px] text-[color:var(--muted)]">
                    {c.monthly_budget_cents > 0
                      ? `${formatPhp(c.monthly_budget_cents)} / month`
                      : "No budget set"}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 sm:shrink-0">
                <button
                  type="button"
                  className="btn btn-ghost flex-1 sm:flex-none"
                  onClick={() => openEdit(c)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="btn btn-ghost flex-1 sm:flex-none"
                  onClick={() => void remove(c.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        labelledBy="budget-modal-title"
        panelClassName="max-w-[440px]"
      >
        <h2 id="budget-modal-title" className="font-serif text-xl">
          {form.id ? "Edit category" : "New category"}
        </h2>
            {err && (
              <p className="mt-2 text-sm text-[color:var(--red)]">{err}</p>
            )}
            <div className="mt-6">
              <label className="form-label">Name</label>
              <input
                className="form-input w-full"
                type="text"
                placeholder="e.g. Groceries"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="mt-4">
              <label className="form-label">Monthly budget (₱)</label>
              <MoneyInput
                className="form-input w-full"
                placeholder="0.00"
                value={form.amount}
                onChange={(v) => setForm({ ...form, amount: v })}
              />
            </div>
            <div className="mt-4">
              <label className="form-label">Icon</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setForm({ ...form, icon })}
                    className="flex h-10 w-10 items-center justify-center rounded-[10px] border text-lg transition-colors"
                    style={{
                      borderColor:
                        form.icon === icon
                          ? "var(--accent)"
                          : "var(--border2)",
                      background:
                        form.icon === icon
                          ? "var(--accent-dim)"
                          : "var(--surface2)",
                    }}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4">
              <label className="form-label">Color</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setForm({ ...form, color })}
                    className="h-8 w-8 rounded-full border-2 transition-transform"
                    style={{
                      background: color,
                      borderColor:
                        form.color === color ? "var(--text)" : "transparent",
                      transform:
                        form.color === color ? "scale(1.1)" : "scale(1)",
                    }}
                    aria-label={`Color ${color}`}
                  />
                ))}
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
      </Modal>
    </div>
  );
}
