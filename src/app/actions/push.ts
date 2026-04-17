"use server";

import { createClient } from "@/lib/supabase/server";

export async function savePushSubscription(input: {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: user.id,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
        user_agent: input.userAgent,
      },
      { onConflict: "user_id,endpoint" },
    );
  if (error) throw error;
}

export async function deletePushSubscription(endpoint: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);
  if (error) throw error;
}

export async function sendTestPush() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!session?.access_token) {
    throw new Error("Session expired. Please sign in again.");
  }

  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", user.id);
  if (error) throw error;
  if (!subs || subs.length === 0) {
    throw new Error("No push subscription on this device yet.");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const res = await fetch(`${url}/functions/v1/send-push`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: anon,
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      userId: user.id,
      title: "CashFlow test",
      body: "Notifications are working. You'll get reminders near month-end.",
      url: "/",
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Push failed: ${text}`);
  }
  const data = await res.json();
  return data;
}
