-- Dia "fixado": a cota digitada e salva pelo gestor não é mais alterada pelo
-- recálculo automático. O que falta para a meta vai só para os dias livres.
alter table public.distribuicao_diaria
  add column if not exists cota_fixada boolean not null default false;
