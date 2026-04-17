"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createGoal(input: {
  name: string;
  targetCents: number;
  currentCents: number;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const name = input.name.trim();
  if (!name) throw new Error("Name is required");
  if (input.targetCents <= 0) throw new Error("Target must be greater than 0");

  const { error } = await supabase.from("savings_goals").insert({
    user_id: user.id,
    name,
    target_cents: Math.round(input.targetCents),
    current_cents: Math.max(0, Math.round(input.currentCents)),
  });

  if (error) throw error;
  revalidatePath("/");
  revalidatePath("/goals");
}

export async function updateGoal(input: {
  id: string;
  name: string;
  targetCents: number;
  currentCents: number;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const name = input.name.trim();
  if (!name) throw new Error("Name is required");
  if (input.targetCents <= 0) throw new Error("Target must be greater than 0");

  const { error } = await supabase
    .from("savings_goals")
    .update({
      name,
      target_cents: Math.round(input.targetCents),
      current_cents: Math.max(0, Math.round(input.currentCents)),
    })
    .eq("id", input.id)
    .eq("user_id", user.id);

  if (error) throw error;
  revalidatePath("/");
  revalidatePath("/goals");
}

export async function deleteGoal(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("savings_goals")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;
  revalidatePath("/");
  revalidatePath("/goals");
}
