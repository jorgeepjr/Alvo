# MetaFlow ("alvo") — Handoff do Projeto

> Documento de passagem para continuar o projeto em outra sessão/instância do Claude Code.
> Última atualização: 2026-08-06.

## 1. O que é

Sistema que o dono chama de **"alvo"**; o nome real é **MetaFlow**. É um painel/ERP de
**metas, vendas por vendedor e gamificação** da loja de roupas **ZYNK** (Ipatinga-MG).
Dono/gestor: **Junior** (Jorge Eduardo Pereira Junior).

- Dois perfis de usuário: **gestor** e **vendedor** (coluna `perfil` em `profiles`).
- Vendedores atuais: **Iana** e **Andre**.

Não confundir com outros projetos do mesmo dono: `erp-moda` (outro ERP, em
`C:\Users\Usuario\Projetos\erp-moda`) e a loja Shopify da ZYNK. São coisas diferentes.

## 2. Onde fica

- **Código (pasta local):** `C:\Users\Usuario\Curso IA\aula\metaflow`
- **Repositório GitHub:** https://github.com/jorgeepjr/Alvo  (branch de produção: **`main`**)
- **Site no ar (produção):** https://alvo-alvo.zqu02p.easypanel.host  (hospedado no **EasyPanel**)
- **Banco de dados:** Supabase, projeto **"MetaFlow"**, id `aizttsmoaxcdccfszhyt` (região sa-east-1)

## 3. Stack técnica (e pegadinhas)

- **Next.js 16** (App Router, Turbopack). Build de produção: `next build --webpack`.
- **TypeScript**, **Tailwind CSS v4** (com componentes estilo shadcn + `@base-ui/react`).
- **Vitest 4** para testes de unidade (só funções puras; não há testing-library).
- **Supabase** (Postgres **remoto** — não há Postgres local).
- Fontes: **Inter** (corpo) + **Sora** (títulos/destaque), via `next/font/google`.

⚠️ **Pegadinhas importantes:**
- O `AGENTS.md`/`CLAUDE.md` do projeto avisa que este Next.js tem mudanças; na prática:
  **`searchParams` chega como `Promise` e precisa de `await`** (ver `app/gestor/historico/page.tsx`).
- **Sem banco local:** qualquer migration precisa ser aplicada no Supabase remoto
  (via ferramenta MCP `apply_migration`, projeto `aizttsmoaxcdccfszhyt`). O SQL também é
  salvo em `supabase/migrations/` só para histórico.
- Precisa de **`.env.local`** com as chaves do Supabase (`NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`). Ver `.env.local.example`.
  As chaves NÃO estão neste doc por segurança.

## 4. Banco de dados (tabelas principais — schema `public`)

- **`profiles`** — usuários/vendedores (`id`, `nome`, `perfil` = 'gestor'|'vendedor', `ativo`).
- **`lancamentos`** — lançamentos diários por vendedor (`vendedor_id`, `data`, `valor`,
  `atendimentos`, `pecas`, `vendas`). É a fonte do "quanto cada um vendeu". **Só valores
  agregados** — NÃO há venda por produto/categoria.
- **`distribuicao_diaria`** — cota/meta por dia (`cota_valor`, `cota_atendimentos`,
  `cota_pecas`, `situacao` = normal|feriado|fechado). Meta mensal do vendedor = soma das
  cotas de dias `normal`.
- **`metas_mensais`** — meta da loja por mês (`ano`, `mes`, `meta_valor`, `meta_atendimentos`,
  `meta_pecas`) + **`super_meta_valor`**, **`super_meta_premio`** (adicionados nesta rodada).
- **`metas_vendedor_percentual`** — % da meta por vendedor no mês.
- Gamificação: **`gam_niveis`**, **`gam_config`** (+ **`com_pct_meta`**, **`com_pct_sem`**
  adicionados nesta rodada), **`gam_desafios`**.
- **`rotina_modelo`** / **`rotina_concluida`** — rotina diária dos vendedores.
- **`campanhas`**, **`historico_diario`**, **`historico_loja`**, **`tarefas`**, `assistente_mensagens`.

## 5. Como rodar localmente

```bash
cd "C:\Users\Usuario\Curso IA\aula\metaflow"
npm install
npm run dev        # sobe em http://localhost:3000 (usar --port 3100 se quiser outra porta)
npm test           # roda os testes (Vitest)
npx tsc --noEmit   # checagem de tipos
npx eslint <arquivo>
```

O app exige login. O banco é o de produção (não há banco local), então cuidado ao testar.

## 6. Como fazer deploy (colocar no ar)

O EasyPanel builda pelo **Dockerfile** (`npm ci` + `npm run build`, saída Next `standalone`)
e faz o deploy sozinho **ao dar push na branch `main`**.

```bash
# estando com tudo commitado em master (que trackeia origin/main):
git push origin master:main
```

Isso dispara o rebuild no EasyPanel (~2–5 min) e atualiza o site. Local `master` == `origin/main`.
**Antes de publicar:** rodar `npm run build` e `npm test` (nada quebrado). Migrations de banco
devem ser aplicadas no Supabase **antes/junto** do deploy.

## 7. O que foi construído nesta rodada (tudo JÁ no ar — 2026-08-06)

Todos os commits abaixo estão em `main`/produção. Banco já migrado.

1. **Seletor de mês no Ranking do Dashboard** — `app/gestor/page.tsx`. Ver o ranking de
   valor/atendimentos/peças por vendedor de qualquer mês.

2. **Comissão por vendedor** (regra da loja: **2% se bateu a meta do mês, 1% se não**; %
   configuráveis, default 2/1):
   - `lib/comissao.ts` (função pura `calcularComissao`, testada em `lib/comissao.test.ts`).
   - Colunas `com_pct_meta`/`com_pct_sem` em `gam_config`
     (migration `supabase/migrations/20260804_comissao_config.sql`).
   - Página **`/gestor/comissoes`** (`app/gestor/comissoes/page.tsx` + `actions.ts` +
     `seletor-mes.tsx` (client, carrega ao escolher o mês) + `components/botao-csv-comissao.tsx`).
     Tabela por vendedor, total a pagar, exportar CSV. Inclui vendedores **inativos** no
     fechamento de meses passados (para não sumir quem vendeu e depois foi desativado).
   - Card **"Sua comissão do mês"** em `app/painel/desempenho/page.tsx` e no painel
     `app/painel/page.tsx`. Sempre do MÊS (nada de número diário, que confundiria).
   - Item **"Comissão"** no menu (`components/sidebar-gestor.tsx`).

3. **Visual novo — "minimalista futurista" (Neon Glass como acento)**:
   - `app/globals.css` (acento ciano nos tokens dark, fundo escuro atmosférico com brilho
     sutil, glow em barras/CTAs/nav ativa, bordas frias, scrollbar, seleção).
   - `app/layout.tsx` (fonte de destaque **Sora**).
   - `app/login/page.tsx` (polimento da vitrine). É tema **central** — vale para todas as telas.

4. **Super Meta da loja** (meta acima da normal, com prêmio; ex.: loja > 90k → uma peça de roupa):
   - Colunas `super_meta_valor`/`super_meta_premio` em `metas_mensais`
     (migration `supabase/migrations/20260806_super_meta_loja.sql`).
   - Configura em **`/gestor/metas`** (`app/gestor/metas/page.tsx` + `actions.ts`).
   - Componente `components/super-meta-card.tsx`, exibido no Dashboard (`app/gestor/page.tsx`)
     e no painel do vendedor (`app/painel/page.tsx`). É do **total da loja no mês**, 1 nível.

5. **Correção** — gráfico "Evolução 12 meses" do vendedor (`app/gestor/vendedores/[id]/page.tsx`)
   passou a manter os **centavos reais** (antes arredondava para inteiro).

## 8. Documentos internos úteis

- `docs/superpowers/specs/2026-08-04-comissao-vendedor-design.md` — spec da comissão.
- `docs/superpowers/plans/2026-08-04-comissao-vendedor.md` — plano de implementação da comissão.
- `docs/referencia/portal-criar-gamificacao.md` — **referência capturada do portal externo**
  (CRIAR Varejo) que a loja usa: estrutura de Configurações (indicadores/comissão/medalhas) e
  "Desempenho da Loja". Base para as fases futuras.

## 9. Fases/ideias futuras (não feitas — a maioria BLOQUEADA por falta de dado)

O alvo já replica quase toda a gamificação do portal CRIAR. O que falta depende de **coletar
mais dados no dia a dia**, que hoje não são lançados:

- **Comissão/metas por categoria** (marca/coleção/aging) — exige lançar venda por categoria.
- **Indicadores extras** do portal: taxa de **conversão**, **preço médio**, e medir por
  **venda líquida** (bruta − crédito de troca − cupom). Hoje só existe um `valor` agregado.
- **Repaginada visual** já foi feita (item 7.3); ajustes de intensidade são fáceis via `globals.css`.

## 10. Como trabalhar aqui (preferências do dono)

- Responder **sempre em português (PT-BR)**, direto e objetivo, sem enrolação e sem puxar saco.
- Ele é **leigo em programação** — explicar em termos simples, sem jargão.
- **Nunca** apagar nada nem rodar comando perigoso sem avisar antes.
- Ao mexer no visual/gamificação, priorizar **legibilidade no uso diário** (é ferramenta de
  todo dia); o estilo é "minimalista futurista", não "neon em tudo".
