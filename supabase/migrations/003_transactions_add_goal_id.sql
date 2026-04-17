-- Links a transaction to a savings goal. When a transaction is saved with
-- a goal_id, it's treated as a contribution to that goal (the goal's
-- current_cents is bumped in the server action).

alter table public.transactions
  add column if not exists goal_id uuid references public.savings_goals(id)
    on delete set null;

create index if not exists transactions_goal_id_idx
  on public.transactions(goal_id);
