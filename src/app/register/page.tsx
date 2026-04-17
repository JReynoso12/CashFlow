"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendWelcomeEmail } from "@/app/actions/email";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }
    setPending(true);
    const supabase = createClient();
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: origin ? `${origin}/auth/callback` : undefined,
      },
    });
    if (error) {
      setPending(false);
      setMessage(error.message);
      return;
    }
    await sendWelcomeEmail(email.trim());
    setPending(false);
    if (data.session) {
      router.push("/");
      router.refresh();
      return;
    }
    router.push("/login?registered=1");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="mb-10 text-center">
        <div className="font-serif text-2xl text-[color:var(--accent)]">Cashflow</div>
        <p className="mt-1 text-sm text-[color:var(--muted)]">Personal Finance</p>
      </div>
      <form
        onSubmit={(e) => void submit(e)}
        className="w-full max-w-[360px] rounded-[14px] border border-[color:var(--border2)] bg-[color:var(--surface)] p-8"
      >
        <h1 className="font-serif text-xl">Create account</h1>
        {message && (
          <p className="mt-3 text-sm text-[color:var(--red)]">{message}</p>
        )}
        <label className="form-label mt-6">Email</label>
        <input
          className="form-input mb-4"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <label className="form-label">Password</label>
        <input
          className="form-input mb-6"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="submit"
          className="btn btn-primary w-full"
          disabled={pending}
        >
          {pending ? "Creating…" : "Register"}
        </button>
        <p className="mt-6 text-center text-sm text-[color:var(--muted)]">
          Already have an account?{" "}
          <Link href="/login" className="text-[color:var(--accent)] hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
