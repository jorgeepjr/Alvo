-- Dias das 2 avaliações do mês (Junior, 12/11): meio do mês (15) e reta final (20 a 25).
alter table public.gam_config
  add column if not exists aval_meio smallint not null default 15,
  add column if not exists aval_final_ini smallint not null default 20,
  add column if not exists aval_final_fim smallint not null default 25;
