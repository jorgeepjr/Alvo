-- Super Meta da loja: alvo acima da meta normal + prêmio (por mês).
alter table public.metas_mensais
  add column if not exists super_meta_valor numeric not null default 0,
  add column if not exists super_meta_premio text not null default '';
