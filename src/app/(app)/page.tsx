import {
  DashboardClient,
  type CategoryRow,
  type GoalRow,
  type RangeTx,
} from "@/components/dashboard/DashboardClient";
import { createClient } from "@/lib/supabase/server";

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function HomePage() {
  const now = new Date();
  const year = now.getFullYear();
  const month0 = now.getMonth();

  const supabase = await createClient();
  const sixStart = iso(new Date(year, month0 - 5, 1));
  const mEnd = iso(new Date(year, month0 + 1, 0));

  const [catRes, goalRes, rangeRes] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order"),
    supabase.from("savings_goals").select("*").order("created_at"),
    supabase
      .from("transactions")
      .select(
        "id, amount_cents, description, occurred_at, category_id, goal_id",
      )
      .gte("occurred_at", sixStart)
      .lte("occurred_at", mEnd)
      .order("occurred_at", { ascending: false }),
  ]);

  return (
    <DashboardClient
      initialYear={year}
      initialMonth0={month0}
      initialCategories={(catRes.data ?? []) as CategoryRow[]}
      initialGoals={(goalRes.data ?? []) as GoalRow[]}
      initialRangeTx={(rangeRes.data ?? []) as RangeTx[]}
    />
  );
}
