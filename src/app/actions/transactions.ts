"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addTransaction(input: {
  amountCents: number;
  description: string;
  categoryId: string | null;
  occurredAt: string;
  type: "income" | "expense";
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const signed =
    input.type === "expense"
      ? -Math.abs(input.amountCents)
      : Math.abs(input.amountCents);

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    category_id: input.categoryId,
    amount_cents: signed,
    description: input.description.trim(),
    occurred_at: input.occurredAt,
  });

  if (error) throw error;
  revalidatePath("/");
  revalidatePath("/transactions");
}
