"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const err = searchParams.get("error");
  const registered = searchParams.get("registered");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(
    err === "auth" ? "Could not complete sign-in. Try again." : null,
  );
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setPending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setPending(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <form
      onSubmit={(e) => void submit(e)}
      className="w-full max-w-[360px] rounded-[14px] border border-[color:var(--border2)] bg-[color:var(--surface)] p-8"
    >
      <h1 className="font-serif text-xl">Sign in</h1>
      {registered && (
        <p className="mt-3 text-sm text-[color:var(--accent)]">
          Account created. Sign in when you are ready (confirm email if required).
        </p>
      )}
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
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button
        type="submit"
        className="btn btn-primary w-full"
        disabled={pending}
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <p className="mt-6 text-center text-sm text-[color:var(--muted)]">
        No account?{" "}
        <Link href="/register" className="text-[color:var(--accent)] hover:underline">
          Create one
        </Link>
      </p>
    </form>
  );
}
