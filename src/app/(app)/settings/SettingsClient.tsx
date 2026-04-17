"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  changePassword,
  resetAllData,
  updateDisplayName,
} from "@/app/actions/settings";

type Props = {
  email: string;
  displayName: string;
  createdAt: string | null;
};

type Notice = { kind: "ok" | "err"; text: string } | null;

export function SettingsClient({ email, displayName, createdAt }: Props) {
  const router = useRouter();

  const [name, setName] = useState(displayName);
  const [nameSaving, setNameSaving] = useState(false);
  const [nameNotice, setNameNotice] = useState<Notice>(null);

  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwNotice, setPwNotice] = useState<Notice>(null);

  const [exporting, setExporting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [dataNotice, setDataNotice] = useState<Notice>(null);

  async function saveName() {
    setNameNotice(null);
    setNameSaving(true);
    try {
      await updateDisplayName(name);
      setNameNotice({ kind: "ok", text: "Saved." });
      router.refresh();
    } catch (e) {
      setNameNotice({
        kind: "err",
        text: e instanceof Error ? e.message : "Could not save",
      });
    } finally {
      setNameSaving(false);
    }
  }

  async function savePassword() {
    setPwNotice(null);
    if (pw.length < 6) {
      setPwNotice({ kind: "err", text: "Password must be at least 6 characters." });
      return;
    }
    if (pw !== pw2) {
      setPwNotice({ kind: "err", text: "Passwords do not match." });
      return;
    }
    setPwSaving(true);
    try {
      await changePassword(pw);
      setPw("");
      setPw2("");
      setPwNotice({ kind: "ok", text: "Password updated." });
    } catch (e) {
      setPwNotice({
        kind: "err",
        text: e instanceof Error ? e.message : "Could not update password",
      });
    } finally {
      setPwSaving(false);
    }
  }

  async function exportCsv() {
    setDataNotice(null);
    setExporting(true);
    try {
      const supabase = createClient();
      const [tx, cats] = await Promise.all([
        supabase
          .from("transactions")
          .select("amount_cents, description, occurred_at, category_id, created_at")
          .order("occurred_at", { ascending: false }),
        supabase.from("categories").select("id, name"),
      ]);
      if (tx.error) throw tx.error;
      if (cats.error) throw cats.error;

      const catMap = new Map(
        (cats.data ?? []).map((c) => [c.id as string, c.name as string]),
      );
      const rows = (tx.data ?? []) as {
        amount_cents: number;
        description: string;
        occurred_at: string;
        category_id: string | null;
        created_at: string;
      }[];

      const header = ["Date", "Description", "Category", "Type", "Amount (PHP)"];
      const lines = [header.join(",")];
      for (const r of rows) {
        const type = r.amount_cents > 0 ? "Income" : "Expense";
        const amount = (Math.abs(r.amount_cents) / 100).toFixed(2);
        const cat = r.category_id ? catMap.get(r.category_id) ?? "" : "";
        const cells = [r.occurred_at, r.description, cat, type, amount].map(
          csvCell,
        );
        lines.push(cells.join(","));
      }

      const blob = new Blob([lines.join("\n")], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `cashflow-transactions-${stamp}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setDataNotice({
        kind: "ok",
        text: `Exported ${rows.length} transaction${rows.length === 1 ? "" : "s"}.`,
      });
    } catch (e) {
      setDataNotice({
        kind: "err",
        text: e instanceof Error ? e.message : "Export failed",
      });
    } finally {
      setExporting(false);
    }
  }

  async function resetData() {
    const confirmed = window.prompt(
      'Delete ALL your transactions, goals, and categories? This cannot be undone.\n\nType "RESET" to confirm.',
    );
    if (confirmed !== "RESET") return;
    setDataNotice(null);
    setResetting(true);
    try {
      await resetAllData();
      setDataNotice({ kind: "ok", text: "All data cleared." });
      router.refresh();
    } catch (e) {
      setDataNotice({
        kind: "err",
        text: e instanceof Error ? e.message : "Could not reset",
      });
    } finally {
      setResetting(false);
    }
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="page-title mb-2">Preferences</h1>
      <p className="page-sub mb-8">
        Manage your account, security, and data.
      </p>

      <div className="flex flex-col gap-6">
        <section className="card">
          <div className="card-title">Account</div>
          <div className="flex flex-col gap-4">
            <div>
              <label className="form-label">Email</label>
              <input
                className="form-input w-full cursor-not-allowed opacity-70"
                type="email"
                value={email}
                readOnly
              />
              {createdAt && (
                <p className="mt-1.5 text-[11px] text-[color:var(--muted)]">
                  Member since{" "}
                  {new Date(createdAt).toLocaleDateString("en-PH", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              )}
            </div>
            <div>
              <label className="form-label">Display name</label>
              <input
                className="form-input w-full"
                type="text"
                placeholder="e.g. Nikko"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <p className="mt-1.5 text-[11px] text-[color:var(--muted)]">
                Shown in the sidebar instead of your email prefix.
              </p>
            </div>
            {nameNotice && <Banner notice={nameNotice} />}
            <div>
              <button
                type="button"
                className="btn btn-primary"
                disabled={nameSaving || name === displayName}
                onClick={() => void saveName()}
              >
                {nameSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-title">Security</div>
          <div className="flex flex-col gap-4">
            <div>
              <label className="form-label">New password</label>
              <input
                className="form-input w-full"
                type="password"
                autoComplete="new-password"
                minLength={6}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">Confirm new password</label>
              <input
                className="form-input w-full"
                type="password"
                autoComplete="new-password"
                minLength={6}
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
              />
            </div>
            {pwNotice && <Banner notice={pwNotice} />}
            <div>
              <button
                type="button"
                className="btn btn-primary"
                disabled={pwSaving || pw.length === 0}
                onClick={() => void savePassword()}
              >
                {pwSaving ? "Updating…" : "Update password"}
              </button>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-title">Data</div>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="text-[13.5px] font-medium">
                  Export transactions
                </div>
                <div className="text-[12px] text-[color:var(--muted)]">
                  Download a CSV of every transaction with category and PHP
                  amount.
                </div>
              </div>
              <button
                type="button"
                className="btn btn-ghost shrink-0"
                disabled={exporting}
                onClick={() => void exportCsv()}
              >
                {exporting ? "Preparing…" : "Export CSV"}
              </button>
            </div>
            <div className="h-px bg-[color:var(--border)]" />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="text-[13.5px] font-medium text-[color:var(--red)]">
                  Reset all data
                </div>
                <div className="text-[12px] text-[color:var(--muted)]">
                  Permanently delete every category, transaction, and savings
                  goal in your account.
                </div>
              </div>
              <button
                type="button"
                className="btn shrink-0 border border-[color:var(--red)] bg-transparent text-[color:var(--red)] hover:bg-[color:var(--red-dim)]"
                disabled={resetting}
                onClick={() => void resetData()}
              >
                {resetting ? "Resetting…" : "Reset"}
              </button>
            </div>
            {dataNotice && <Banner notice={dataNotice} />}
          </div>
        </section>

        <section className="card">
          <div className="card-title">Session</div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-[13.5px] text-[color:var(--muted2)]">
              Sign out of this device.
            </div>
            <button
              type="button"
              className="btn btn-ghost shrink-0"
              onClick={() => void signOut()}
            >
              Sign out
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function Banner({ notice }: { notice: { kind: "ok" | "err"; text: string } }) {
  const ok = notice.kind === "ok";
  return (
    <p
      className={`text-[12px] ${
        ok ? "text-[color:var(--accent)]" : "text-[color:var(--red)]"
      }`}
    >
      {notice.text}
    </p>
  );
}

function csvCell(value: string | number | null | undefined) {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
