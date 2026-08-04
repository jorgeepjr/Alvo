-- Comissão: duas percentagens configuráveis na config da gamificação.
alter table public.gam_config
  add column if not exists com_pct_meta numeric not null default 2,
  add column if not exists com_pct_sem  numeric not null default 1;
