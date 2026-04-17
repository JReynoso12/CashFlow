import Image from "next/image";
import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-2xl bg-white p-2 shadow-lg">
          <Image
            src="/logo.png"
            alt="CashFlow"
            width={80}
            height={80}
            className="h-full w-full object-contain"
            priority
          />
        </div>
        <div className="font-serif text-2xl text-[color:var(--accent)]">
          CashFlow
        </div>
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
