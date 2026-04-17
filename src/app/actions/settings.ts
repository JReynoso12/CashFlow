"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateDisplayName(displayName: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const name = displayName.trim();
  const { error } = await supabase.auth.updateUser({
    data: { display_name: name || null },
  });

  if (error) throw error;
  revalidatePath("/", "layout");
}

export async function changePassword(newPassword: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  if (newPassword.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function resetAllData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const [tx, goals, cats] = await Promise.all([
    supabase.from("transactions").delete().eq("user_id", user.id),
    supabase.from("savings_goals").delete().eq("user_id", user.id),
    supabase.from("categories").delete().eq("user_id", user.id),
  ]);

  if (tx.error) throw tx.error;
  if (goals.error) throw goals.error;
  if (cats.error) throw cats.error;

  revalidatePath("/", "layout");
}
