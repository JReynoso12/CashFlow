import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

// Sends a Web Push notification to every stored subscription for a given
// user, or to all users if `userId` is omitted. Used by the Settings
// "Send test" button and by the savings-reminder cron.

Deno.serve(async (req) => {
  try {
    const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@example.com";
    if (!vapidPublic || !vapidPrivate) {
      return json({ error: "VAPID keys not configured" }, 500);
    }
    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

    const auth = req.headers.get("Authorization") ?? "";
    const isCron =
      Deno.env.get("CRON_SECRET") &&
      auth === `Bearer ${Deno.env.get("CRON_SECRET")}`;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let callerUserId: string | null = null;
    if (!isCron) {
      const token = auth.replace(/^Bearer\s+/i, "");
      if (!token) return json({ error: "Missing bearer token" }, 401);
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data.user) return json({ error: "Invalid token" }, 401);
      callerUserId = data.user.id;
    }

    const body = (await req.json().catch(() => ({}))) as {
      userId?: string;
      title?: string;
      body?: string;
      url?: string;
      tag?: string;
    };

    const targetUserId = isCron ? body.userId ?? null : callerUserId;
    if (!isCron && body.userId && body.userId !== callerUserId) {
      return json({ error: "Forbidden" }, 403);
    }

    let query = supabase.from("push_subscriptions").select("*");
    if (targetUserId) query = query.eq("user_id", targetUserId);
    const { data: subs, error: subsErr } = await query;
    if (subsErr) return json({ error: subsErr.message }, 500);
    if (!subs || subs.length === 0) return json({ sent: 0 });

    const payload = JSON.stringify({
      title: body.title ?? "CashFlow",
      body: body.body ?? "You have a new reminder.",
      url: body.url ?? "/",
      tag: body.tag ?? "cashflow",
    });

    let sent = 0;
    let dead = 0;
    const deadIds: string[] = [];

    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: s.endpoint as string,
              keys: {
                p256dh: s.p256dh as string,
                auth: s.auth as string,
              },
            },
            payload,
          );
          sent += 1;
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            dead += 1;
            deadIds.push(s.id as string);
          }
        }
      }),
    );

    if (deadIds.length > 0) {
      await supabase.from("push_subscriptions").delete().in("id", deadIds);
    }

    return json({ sent, dead });
  } catch (e) {
    return json(
      { error: e instanceof Error ? e.message : String(e) },
      500,
    );
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
