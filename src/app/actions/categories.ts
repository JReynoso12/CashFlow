"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createCategory(input: {
  name: string;
  icon: string;
  color: string;
  monthlyBudgetCents: number;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const name = input.name.trim();
  if (!name) throw new Error("Name is required");

  const { data: last } = await supabase
    .from("categories")
    .select("sort_order")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = (last?.sort_order ?? -1) + 1;

  const { error } = await supabase.from("categories").insert({
    user_id: user.id,
    name,
    icon: input.icon || "💳",
    color: input.color || "#3ed9a0",
    monthly_budget_cents: Math.max(0, Math.round(input.monthlyBudgetCents)),
    sort_order: nextOrder,
  });

  if (error) throw error;
  revalidatePath("/");
  revalidatePath("/budgets");
}

export async function updateCategory(input: {
  id: string;
  name: string;
  icon: string;
  color: string;
  monthlyBudgetCents: number;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const name = input.name.trim();
  if (!name) throw new Error("Name is required");

  const { error } = await supabase
    .from("categories")
    .update({
      name,
      icon: input.icon || "💳",
      color: input.color || "#3ed9a0",
      monthly_budget_cents: Math.max(0, Math.round(input.monthlyBudgetCents)),
    })
    .eq("id", input.id)
    .eq("user_id", user.id);

  if (error) throw error;
  revalidatePath("/");
  revalidatePath("/budgets");
}

const DEFAULT_CATEGORIES: {
  name: string;
  icon: string;
  color: string;
  sort_order: number;
}[] = [
  { name: "Housing", icon: "🏠", color: "#3ed9a0", sort_order: 0 },
  { name: "Food & Dining", icon: "🍽️", color: "#5b9cf6", sort_order: 1 },
  { name: "Transportation", icon: "🚗", color: "#f5c842", sort_order: 2 },
  { name: "Entertainment", icon: "🎬", color: "#d46fd4", sort_order: 3 },
  { name: "Utilities", icon: "⚡", color: "#f2956c", sort_order: 4 },
  { name: "Healthcare", icon: "💊", color: "#a0e26a", sort_order: 5 },
  { name: "Income", icon: "💸", color: "#3ed9a0", sort_order: 6 },
  { name: "Other", icon: "💳", color: "#8899aa", sort_order: 7 },
];

export async function addDefaultCategories() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: existing } = await supabase
    .from("categories")
    .select("name, sort_order")
    .eq("user_id", user.id);

  const existingNames = new Set((existing ?? []).map((c) => c.name));
  const maxOrder = (existing ?? []).reduce(
    (m, c) => Math.max(m, c.sort_order ?? 0),
    -1,
  );

  const rows = DEFAULT_CATEGORIES.filter(
    (c) => !existingNames.has(c.name),
  ).map((c, i) => ({
    user_id: user.id,
    name: c.name,
    icon: c.icon,
    color: c.color,
    monthly_budget_cents: 0,
    sort_order: maxOrder + 1 + i,
  }));

  if (rows.length === 0) return 0;

  const { error } = await supabase.from("categories").insert(rows);
  if (error) throw error;

  revalidatePath("/");
  revalidatePath("/budgets");
  return rows.length;
}

export async function deleteCategory(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;
  revalidatePath("/");
  revalidatePath("/budgets");
}
