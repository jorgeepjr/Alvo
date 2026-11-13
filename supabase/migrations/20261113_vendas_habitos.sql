-- Repaginada 12/11/2026 — só acrescenta, não apaga nada.

-- 1) Venda por venda (o vendedor registra durante o dia, só hoje).
--    No fim do dia o sistema soma no lançamento do dia, a não ser que o
--    gestor já tenha corrigido o dia pelo fechamento de caixa.
create table if not exists public.vendas (
  id uuid primary key default gen_random_uuid(),
  vendedor_id uuid not null references public.profiles(id),
  data date not null,
  hora text not null,
  pecas integer not null check (pecas > 0),
  valor numeric(12,2) not null check (valor > 0),
  whatsapp boolean not null default false,
  criado_em timestamptz not null default now()
);
create index if not exists vendas_vendedor_data on public.vendas (vendedor_id, data);
alter table public.vendas enable row level security;
create policy vendas_select on public.vendas for select
  using (vendedor_id = (select auth.uid()) or (select is_gestor()));
create policy vendas_insert on public.vendas for insert
  with check ((select is_gestor()) or (vendedor_id = (select auth.uid()) and data = (now() at time zone 'America/Sao_Paulo')::date));
create policy vendas_delete on public.vendas for delete
  using ((select is_gestor()) or (vendedor_id = (select auth.uid()) and data = (now() at time zone 'America/Sao_Paulo')::date));

-- 2) Lançamento do dia: quanto veio do WhatsApp e quem corrigiu.
alter table public.lancamentos
  add column if not exists valor_whatsapp numeric(12,2) not null default 0,
  add column if not exists corrigido_por uuid references public.profiles(id),
  add column if not exists corrigido_em timestamptz;

-- 3) Rotina simplificada: até 5 hábitos por dia, iguais pra todos.
create table if not exists public.habitos (
  id uuid primary key default gen_random_uuid(),
  texto text not null,
  porque text,
  ordem integer not null default 0,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
alter table public.habitos enable row level security;
create policy habitos_select on public.habitos for select using (true);
create policy habitos_insert on public.habitos for insert with check ((select is_gestor()));
create policy habitos_update on public.habitos for update using ((select is_gestor()));
create policy habitos_delete on public.habitos for delete using ((select is_gestor()));

create table if not exists public.habitos_feitos (
  id uuid primary key default gen_random_uuid(),
  habito_id uuid not null references public.habitos(id) on delete cascade,
  vendedor_id uuid not null references public.profiles(id),
  data date not null,
  feito_em timestamptz not null default now(),
  unique (habito_id, vendedor_id, data)
);
alter table public.habitos_feitos enable row level security;
create policy habitos_feitos_select on public.habitos_feitos for select
  using (vendedor_id = (select auth.uid()) or (select is_gestor()));
create policy habitos_feitos_insert on public.habitos_feitos for insert
  with check (vendedor_id = (select auth.uid()));
create policy habitos_feitos_delete on public.habitos_feitos for delete
  using (vendedor_id = (select auth.uid()));

-- Os hábitos do protótipo de 12/11 (Suzana 04/11 + pedidos do Junior). Máximo 5.
insert into public.habitos (texto, porque, ordem)
select * from (values
  ('Reposição: araras e vitrine completas antes de abrir', 'Peça que falta na arara é venda que não acontece.', 1),
  ('Mostrar 3 peças antigas em cada atendimento', 'Gira o estoque parado.', 2),
  ('Pós-venda: áudio pra quem comprou há 7 dias', 'Evolving: 7 dias depois da compra o cliente já usou a peça. Gera recompra.', 3),
  ('Salvar nome e WhatsApp de todo cliente, até de quem não comprou', 'Quem entra e não compra também vira contato pra lista VIP.', 4),
  ('Cobrar as condicionais vencidas (áudio ou ligação)', 'Condicional vencida é dinheiro parado na casa do cliente.', 5)
) v(texto, porque, ordem)
where not exists (select 1 from public.habitos);

-- (aplicada à parte: 20261113_lancamentos_vendedor_apaga_hoje)
-- O vendedor apaga a única venda do dia → o lançamento automático do dia some.
create policy lancamentos_delete_vendedor_hoje on public.lancamentos for delete
  using (vendedor_id = (select auth.uid()) and corrigido_por is null and dia_fechado = false
         and data = (now() at time zone 'America/Sao_Paulo')::date);
