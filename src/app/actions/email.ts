"use server";

import { Resend } from "resend";

export async function sendWelcomeEmail(email: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return { ok: true as const, skipped: true as const };
  }

  const from =
    process.env.RESEND_FROM_EMAIL ?? "Cashflow <onboarding@resend.dev>";

  const resend = new Resend(key);
  const { error } = await resend.emails.send({
    from,
    to: email.trim(),
    subject: "Welcome to Cashflow",
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h1 style="color:#3ed9a0;font-size:22px;">Cashflow</h1>
        <p style="color:#e8ede9;line-height:1.6;">Thanks for signing up. Track spending, hit savings goals, and stay on budget — all in one place.</p>
        <p style="color:#6b7a72;font-size:13px;">Personal finance, simplified.</p>
      </div>
    `,
  });

  if (error) {
    return { ok: false as const, error: error.message };
  }

  return { ok: true as const };
}
