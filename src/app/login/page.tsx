import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="mb-10 text-center">
        <div className="font-serif text-2xl text-[color:var(--accent)]">Cashflow</div>
        <p className="mt-1 text-sm text-[color:var(--muted)]">Personal Finance</p>
      </div>
      <Suspense
        fallback={
          <div className="w-full max-w-[360px] rounded-[14px] border border-[color:var(--border2)] bg-[color:var(--surface)] p-8 text-[color:var(--muted)]">
            Loading…
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
