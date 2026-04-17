-- Adds a cadence (monthly / yearly / one_time) and a planned contribution
-- amount to savings goals. Used to show progress per period and project
-- an ETA to completion.

alter table public.savings_goals
  add column if not exists cadence text not null default 'one_time'
    check (cadence in ('one_time', 'monthly', 'yearly'));

alter table public.savings_goals
  add column if not exists contribution_cents bigint not null default 0;
