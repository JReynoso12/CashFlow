import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Invoked by pg_cron (and optionally manually). Finds users who have at
// least one monthly savings goal with a planned contribution but have not
// logged any savings transactions this month, and:
//   1. Emails them a nudge (Resend)
//   2. Fires a Web Push notification (via the send-push edge function)

interface Goal {
  id: string;
  user_id: string;
  name: string;
  cadence: string;
  contribution_cents: number;
}

interface Tx {
  user_id: string;
  goal_id: string | null;
  occurred_at: string;
}

Deno.serve(async (req) => {
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret) return json({ error: "CRON_SECRET not configured" }, 500);
  if (req.headers.get("Authorization") !== `Bearer ${cronSecret}`) {
    return json({ error: "Unauthorized" }, 401);
  }

  const resendKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail =
    Deno.env.get("RESEND_FROM_EMAIL") ?? "Cashflow <onboarding@resend.dev>";
  const appUrl = Deno.env.get("APP_URL") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

  const supabase = createClient(
    supabaseUrl,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const now = new Date();
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  )
    .toISOString()
    .slice(0, 10);
  const monthLabel = now.toLocaleString("en-US", { month: "long" });

  const { data: goalsData, error: goalsErr } = await supabase
    .from("savings_goals")
    .select("id, user_id, name, cadence, contribution_cents")
    .eq("cadence", "monthly")
    .gt("contribution_cents", 0);
  if (goalsErr) return json({ error: goalsErr.message }, 500);

  const goals = (goalsData ?? []) as Goal[];
  if (goals.length === 0) return json({ sent: 0, reason: "no_monthly_goals" });

  const goalsByUser = new Map<string, Goal[]>();
  for (const g of goals) {
    const list = goalsByUser.get(g.user_id) ?? [];
    list.push(g);
    goalsByUser.set(g.user_id, list);
  }

  const userIds = Array.from(goalsByUser.keys());
  const { data: txData, error: txErr } = await supabase
    .from("transactions")
    .select("user_id, goal_id, occurred_at")
    .in("user_id", userIds)
    .not("goal_id", "is", null)
    .gte("occurred_at", monthStart);
  if (txErr) return json({ error: txErr.message }, 500);

  const fundedByUser = new Map<string, Set<string>>();
  for (const t of (txData ?? []) as Tx[]) {
    if (!t.goal_id) continue;
    const set = fundedByUser.get(t.user_id) ?? new Set<string>();
    set.add(t.goal_id);
    fundedByUser.set(t.user_id, set);
  }

  const emails = new Map<string, string>();
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) return json({ error: error.message }, 500);
    for (const u of data.users) if (u.email) emails.set(u.id, u.email);
    if (data.users.length < 200) break;
    page += 1;
    if (page > 50) break;
  }

  let emailsSent = 0;
  let emailsFailed = 0;
  let pushed = 0;
  let pushFailed = 0;
  const details: {
    user: string;
    unfunded: string[];
    emailOk: boolean;
    pushOk: boolean;
  }[] = [];

  for (const [userId, userGoals] of goalsByUser) {
    const funded = fundedByUser.get(userId) ?? new Set<string>();
    const unfunded = userGoals.filter((g) => !funded.has(g.id));
    if (unfunded.length === 0) continue;

    let emailOk = false;
    const email = emails.get(userId);
    if (email && resendKey) {
      emailOk = await sendEmail({
        apiKey: resendKey,
        from: fromEmail,
        to: email,
        monthLabel,
        unfunded,
        appUrl,
      });
      if (emailOk) emailsSent += 1;
      else emailsFailed += 1;
    }

    const pushOk = await fanoutPush({
      supabaseUrl,
      cronSecret,
      userId,
      monthLabel,
      unfunded,
    });
    if (pushOk) pushed += 1;
    else pushFailed += 1;

    details.push({
      user: userId,
      unfunded: unfunded.map((g) => g.name),
      emailOk,
      pushOk,
    });
  }

  return json({
    emailsSent,
    emailsFailed,
    pushed,
    pushFailed,
    details,
  });
});

async function sendEmail(input: {
  apiKey: string;
  from: string;
  to: string;
  monthLabel: string;
  unfunded: Goal[];
  appUrl: string;
}): Promise<boolean> {
  const { apiKey, from, to, monthLabel, unfunded, appUrl } = input;
  const list = unfunded
    .map(
      (g) =>
        `<li style="padding:6px 0;color:#e8ede9;">${escapeHtml(g.name)} — <span style="color:#6b7a72;">₱${(g.contribution_cents / 100).toLocaleString("en-PH")} planned</span></li>`,
    )
    .join("");
  const cta = appUrl
    ? `<a href="${appUrl}/goals" style="display:inline-block;margin-top:16px;background:#3ed9a0;color:#0c1510;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;">Open CashFlow</a>`
    : "";
  const subject =
    unfunded.length === 1
      ? `A reminder for your ${unfunded[0]?.name} goal`
      : `${unfunded.length} savings goals need your attention`;
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0c0f0e;color:#e8ede9;">
      <h1 style="color:#3ed9a0;font-size:22px;margin:0 0 6px;">CashFlow</h1>
      <p style="color:#6b7a72;margin:0 0 18px;font-size:13px;">Monthly savings reminder</p>
      <p style="line-height:1.6;">Hey! It looks like ${monthLabel} is wrapping up and you haven't logged a contribution yet for ${unfunded.length === 1 ? "this goal" : "these goals"}:</p>
      <ul style="padding-left:18px;margin:12px 0;">${list}</ul>
      <p style="line-height:1.6;color:#9aada0;font-size:13px;">Open the app, tap the + button on the dashboard, and pick <strong>Savings</strong> to log a transfer. Future-you will thank you.</p>
      ${cta}
      <p style="color:#6b7a72;font-size:11px;margin-top:28px;">You received this because you have monthly savings goals in CashFlow. Delete the goal or set its contribution to 0 to stop these reminders.</p>
    </div>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ from, to, subject, html }),
  });
  return res.ok;
}

async function fanoutPush(input: {
  supabaseUrl: string;
  cronSecret: string;
  userId: string;
  monthLabel: string;
  unfunded: Goal[];
}): Promise<boolean> {
  const { supabaseUrl, cronSecret, userId, monthLabel, unfunded } = input;
  const title = `${monthLabel} savings reminder`;
  const body =
    unfunded.length === 1
      ? `You haven't funded "${unfunded[0]?.name}" yet this month.`
      : `${unfunded.length} goals haven't been funded this month.`;
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${cronSecret}`,
      },
      body: JSON.stringify({
        userId,
        title,
        body,
        url: "/goals",
        tag: "savings-reminder",
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
