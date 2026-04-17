"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type GoalCadence = "one_time" | "monthly" | "yearly";

const VALID_CADENCES: GoalCadence[] = ["one_time", "monthly", "yearly"];

function normalizeCadence(value: string): GoalCadence {
  return (VALID_CADENCES as string[]).includes(value)
    ? (value as GoalCadence)
    : "one_time";
}

export async function createGoal(input: {
  name: string;
  targetCents: number;
  currentCents: number;
  cadence: GoalCadence;
  contributionCents: number;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const name = input.name.trim();
  if (!name) throw new Error("Name is required");
  if (input.targetCents <= 0) throw new Error("Target must be greater than 0");

  const cadence = normalizeCadence(input.cadence);
  const contribution = Math.max(0, Math.round(input.contributionCents));

  const { error } = await supabase.from("savings_goals").insert({
    user_id: user.id,
    name,
    target_cents: Math.round(input.targetCents),
    current_cents: Math.max(0, Math.round(input.currentCents)),
    cadence,
    contribution_cents: contribution,
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
  cadence: GoalCadence;
  contributionCents: number;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const name = input.name.trim();
  if (!name) throw new Error("Name is required");
  if (input.targetCents <= 0) throw new Error("Target must be greater than 0");

  const cadence = normalizeCadence(input.cadence);
  const contribution = Math.max(0, Math.round(input.contributionCents));

  const { error } = await supabase
    .from("savings_goals")
    .update({
      name,
      target_cents: Math.round(input.targetCents),
      current_cents: Math.max(0, Math.round(input.currentCents)),
      cadence,
      contribution_cents: contribution,
    })
    .eq("id", input.id)
    .eq("user_id", user.id);

  if (error) throw error;
  revalidatePath("/");
  revalidatePath("/goals");
}

export async function contributeToGoal(input: {
  id: string;
  amountCents: number;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  if (input.amountCents <= 0) {
    throw new Error("Contribution must be greater than 0");
  }

  const { data: goal, error: readErr } = await supabase
    .from("savings_goals")
    .select("current_cents, target_cents")
    .eq("id", input.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (readErr) throw readErr;
  if (!goal) throw new Error("Goal not found");

  const next = Math.min(
    goal.target_cents as number,
    (goal.current_cents as number) + Math.round(input.amountCents),
  );

  const { error } = await supabase
    .from("savings_goals")
    .update({ current_cents: next })
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
