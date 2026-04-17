"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type TransactionType = "income" | "expense" | "savings";

export async function addTransaction(input: {
  amountCents: number;
  description: string;
  categoryId: string | null;
  goalId: string | null;
  occurredAt: string;
  type: TransactionType;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const amount = Math.abs(Math.round(input.amountCents));
  if (amount <= 0) throw new Error("Amount must be greater than 0");

  if (input.type === "savings" && !input.goalId) {
    throw new Error("Pick a savings goal for this transaction.");
  }

  // Savings leave the spendable balance (like expenses), so the sign is
  // negative; income stays positive; expense is negative.
  const signed = input.type === "income" ? amount : -amount;

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    category_id: input.type === "savings" ? null : input.categoryId,
    goal_id: input.type === "savings" ? input.goalId : null,
    amount_cents: signed,
    description: input.description.trim(),
    occurred_at: input.occurredAt,
  });
  if (error) throw error;

  if (input.type === "savings" && input.goalId) {
    const { data: goal, error: readErr } = await supabase
      .from("savings_goals")
      .select("current_cents, target_cents")
      .eq("id", input.goalId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (readErr) throw readErr;
    if (goal) {
      const next = (goal.current_cents as number) + amount;
      const { error: updErr } = await supabase
        .from("savings_goals")
        .update({ current_cents: next })
        .eq("id", input.goalId)
        .eq("user_id", user.id);
      if (updErr) throw updErr;
    }
  }

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/goals");
}

export async function deleteTransaction(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: tx, error: readErr } = await supabase
    .from("transactions")
    .select("amount_cents, goal_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (readErr) throw readErr;
  if (!tx) return;

  if (tx.goal_id) {
    const { data: goal } = await supabase
      .from("savings_goals")
      .select("current_cents")
      .eq("id", tx.goal_id as string)
      .eq("user_id", user.id)
      .maybeSingle();
    if (goal) {
      const next = Math.max(
        0,
        (goal.current_cents as number) - Math.abs(tx.amount_cents as number),
      );
      await supabase
        .from("savings_goals")
        .update({ current_cents: next })
        .eq("id", tx.goal_id as string)
        .eq("user_id", user.id);
    }
  }

  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw error;

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/goals");
}
