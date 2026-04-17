"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const nav = [
  { href: "/", label: "Dashboard", icon: NavDashboard },
  { href: "/transactions", label: "Transactions", icon: NavTransactions },
  { href: "/goals", label: "Savings Goals", icon: NavHeart },
  { href: "/reports", label: "Reports", icon: NavReports },
  { href: "/budgets", label: "Budgets", icon: NavBudgets },
];

function NavDashboard() {
  return (
    <svg className="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
function NavTransactions() {
  return (
    <svg className="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}
function NavHeart() {
  return (
    <svg className="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}
function NavReports() {
  return (
    <svg className="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
function NavBudgets() {
  return (
    <svg className="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
    </svg>
  );
}
function NavSettings() {
  return (
    <svg className="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}
function ChevronLeft() {
  return (
    <svg className="h-[14px] w-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}
function ChevronRight() {
  return (
    <svg className="h-[14px] w-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function navClass(active: boolean, collapsed: boolean) {
  return [
    "flex items-center rounded-lg border text-[13.5px] transition-colors",
    collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5",
    active
      ? "border-[color:var(--accent-mid)] bg-[color:var(--accent-dim)] text-[color:var(--accent)]"
      : "border-transparent text-[color:var(--muted2)] hover:bg-[color:var(--surface2)] hover:text-[color:var(--text)]",
  ].join(" ");
}

const COLLAPSE_KEY = "cashflow.sidebar.collapsed";

export function AppSidebar({
  email,
  displayName,
}: {
  email: string;
  displayName?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(COLLAPSE_KEY);
      if (stored === "1") setCollapsed(true);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  const username = displayName?.trim() || email.split("@")[0];
  const initials = username.slice(0, 2).toUpperCase();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className={[
        "sticky top-0 hidden h-screen shrink-0 flex-col overflow-y-auto border-r border-[color:var(--border)] bg-[color:var(--surface)] py-6 transition-[width] duration-200 md:flex",
        collapsed ? "w-[72px] px-2 gap-6" : "w-[240px] px-5 gap-8",
        hydrated ? "" : "invisible",
      ].join(" ")}
    >
      <div className="flex items-center justify-between">
        {collapsed ? (
          <div
            className="mx-auto font-serif text-[22px] leading-none text-[color:var(--accent)]"
            title="Cashflow"
          >
            ₱
          </div>
        ) : (
          <div className="font-serif text-[22px] tracking-tight text-[color:var(--accent)]">
            Cashflow
            <span className="mt-0.5 block font-sans text-xs font-light text-[color:var(--muted2)]">
              Personal Finance
            </span>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={toggle}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className={[
          "flex h-7 w-7 items-center justify-center rounded-md border border-[color:var(--border2)] bg-[color:var(--surface2)] text-[color:var(--muted2)] transition-colors hover:text-[color:var(--text)]",
          collapsed ? "mx-auto" : "self-end",
        ].join(" ")}
      >
        {collapsed ? <ChevronRight /> : <ChevronLeft />}
      </button>

      <nav>
        {!collapsed && <div className="nav-label mb-2">Menu</div>}
        <div className="flex flex-col gap-0.5">
          {nav.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={navClass(active, collapsed)}
                title={collapsed ? item.label : undefined}
                aria-label={collapsed ? item.label : undefined}
              >
                <Icon />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="mt-2">
        {!collapsed && <div className="nav-label mb-2">Settings</div>}
        <Link
          href="/settings"
          className={navClass(pathname === "/settings", collapsed)}
          title={collapsed ? "Preferences" : undefined}
          aria-label={collapsed ? "Preferences" : undefined}
        >
          <NavSettings />
          {!collapsed && <span className="truncate">Preferences</span>}
        </Link>
      </div>

      <div
        className={[
          "mt-auto border-t border-[color:var(--border)] pt-4",
          collapsed
            ? "flex flex-col items-center gap-2"
            : "flex items-center gap-3",
        ].join(" ")}
      >
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[color:var(--accent-mid)] bg-[color:var(--accent-dim)] text-[13px] font-medium text-[color:var(--accent)]"
          title={collapsed ? username : undefined}
        >
          {initials}
        </div>
        {!collapsed && (
          <>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium">{username}</div>
              <div className="text-[11px] text-[color:var(--muted)]">
                Personal Account
              </div>
            </div>
            <button
              type="button"
              onClick={() => void signOut()}
              className="text-[11px] text-[color:var(--muted2)] underline-offset-2 hover:text-[color:var(--text)] hover:underline"
            >
              Sign out
            </button>
          </>
        )}
        {collapsed && (
          <button
            type="button"
            onClick={() => void signOut()}
            aria-label="Sign out"
            title="Sign out"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-[color:var(--border2)] bg-[color:var(--surface2)] text-[color:var(--muted2)] transition-colors hover:text-[color:var(--red)]"
          >
            <svg
              className="h-[14px] w-[14px]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        )}
      </div>
    </aside>
  );
}

export function MobileTopBar({
  email,
  displayName,
}: {
  email: string;
  displayName?: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const username = displayName?.trim() || email.split("@")[0];

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[color:var(--border)] bg-[color:var(--surface)]/90 px-4 py-3 backdrop-blur md:hidden">
        <Link
          href="/"
          className="font-serif text-[18px] text-[color:var(--accent)]"
        >
          Cashflow
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="flex h-9 w-9 items-center justify-center rounded-md border border-[color:var(--border2)] bg-[color:var(--surface2)] text-[color:var(--muted2)]"
        >
          <svg
            className="h-[18px] w-[18px]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </header>
      {open && (
        <div
          className="fixed inset-0 z-[90] md:hidden"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/70" />
          <aside
            role="dialog"
            aria-label="Navigation"
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 top-0 flex h-full w-[260px] flex-col gap-6 overflow-y-auto border-l border-[color:var(--border)] bg-[color:var(--surface)] px-5 py-6"
          >
            <div className="flex items-center justify-between">
              <div className="font-serif text-[20px] text-[color:var(--accent)]">
                Cashflow
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="flex h-8 w-8 items-center justify-center rounded-md border border-[color:var(--border2)] bg-[color:var(--surface2)] text-[color:var(--muted2)]"
              >
                <svg
                  className="h-[16px] w-[16px]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <MobileMenuLinks onNavigate={() => setOpen(false)} />
            <div className="mt-auto flex items-center gap-3 border-t border-[color:var(--border)] pt-4">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium">
                  {username}
                </div>
                <div className="truncate text-[11px] text-[color:var(--muted)]">
                  {email}
                </div>
              </div>
              <button
                type="button"
                onClick={() => void signOut()}
                className="text-[11px] text-[color:var(--muted2)] underline-offset-2 hover:text-[color:var(--text)] hover:underline"
              >
                Sign out
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

function MobileMenuLinks({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname();
  const items = [...nav, { href: "/settings", label: "Preferences", icon: NavSettings }];
  return (
    <nav>
      <div className="nav-label mb-2">Menu</div>
      <div className="flex flex-col gap-0.5">
        {items.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={navClass(active, false)}
            >
              <Icon />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const short = nav.slice(0, 4);
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-[color:var(--border)] bg-[color:var(--surface)] px-2 py-2 md:hidden">
      {short.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-1 py-1 text-[10px] ${
              active ? "text-[color:var(--accent)]" : "text-[color:var(--muted)]"
            }`}
          >
            <Icon />
            <span className="truncate">{item.label.split(" ")[0]}</span>
          </Link>
        );
      })}
    </nav>
  );
}
