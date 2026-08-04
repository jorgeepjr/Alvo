# Fase 1 — Comissão por Vendedor (design)

**Data:** 2026-08-04
**Projeto:** MetaFlow ("alvo") — ERP de metas/gamificação da loja ZYNK
**Autor:** brainstorming com o gestor (Junior)

## Contexto e objetivo

O portal externo que a loja usa (CRIAR Varejo) tem um módulo de Gamificação com
**cálculo de comissão** dos vendedores. O MetaFlow já replica quase tudo desse
módulo (ranking de pontos, níveis, medalhas, desafios, "meu desempenho", metas),
mas **não tem nenhum cálculo de comissão em R$**. Esta é a Fase 1 de um plano em
fases para fechar essa lacuna.

**Meta desta fase:** mostrar, para o gestor e para cada vendedor, a comissão em
R$ do mês, calculada a partir dos dados que o sistema já coleta — sem exigir
nenhum lançamento de dado novo.

## Regra de negócio (definida pelo gestor)

Comissão sobre o total vendido no mês, com a % dependendo de bater a meta
individual do vendedor:

- **Bateu a meta** (vendido ≥ meta) → **2%** do vendido
- **Não bateu** → **1%** do vendido

As duas percentagens são **configuráveis** (defaults 2% e 1%), iguais para todos
os vendedores.

- **Vendido do mês** = soma de `lancamentos.valor` do vendedor no mês.
- **Meta do mês** = soma de `distribuicao_diaria.cota_valor` do vendedor no mês,
  considerando apenas dias com `situacao = 'normal'`. (É a mesma `cotaMes` que a
  gamificação já usa em `lib/gamificacao.ts`, garantindo consistência.)
- "Bateu" exige `meta > 0`. Se o vendedor não tem meta cadastrada no mês, aplica
  a % de "não bateu" (1%).

### Prévia validada (julho/2026, dados reais)

| Vendedor | Vendido | Meta | Bateu? | % | Comissão |
|---|---:|---:|:--:|:--:|---:|
| Iana | R$ 39.716,40 | R$ 30.000 | sim | 2% | R$ 794,33 |
| Andre | R$ 38.948,44 | R$ 30.000 | sim | 2% | R$ 778,97 |
| **Total** | | | | | **R$ 1.573,30** |

## Arquitetura

### 1. Lógica pura (testável) — `lib/comissao.ts`

```ts
export type ConfigComissao = { pctComMeta: number; pctSemMeta: number }
export type ResultadoComissao = {
  bateu: boolean
  percentual: number   // a % aplicada (ex.: 2)
  comissao: number     // R$
  faltaParaMeta: number // R$ que faltam p/ virar a % de meta (0 se já bateu)
}

export function calcularComissao(
  vendido: number,
  meta: number,
  config: ConfigComissao,
): ResultadoComissao
```

Regra: `bateu = meta > 0 && vendido >= meta`; `percentual = bateu ? pctComMeta :
pctSemMeta`; `comissao = vendido * percentual / 100`; `faltaParaMeta = bateu ? 0 :
max(meta - vendido, 0)`.

Função sem I/O, coberta por testes de unidade (ver seção Testes).

### 2. Configuração — coluna nova em `gam_config`

`gam_config` já guarda a config da gamificação (linha única, `id = 1`). Adicionar
duas colunas:

- `com_pct_meta numeric not null default 2`
- `com_pct_sem  numeric not null default 1`

Migration aplicada no Supabase remoto (projeto `aizttsmoaxcdccfszhyt`), já que
este projeto não roda Postgres local. Registrar o SQL em
`supabase/migrations/` para histórico.

O `type Config` e o `CONFIG_PADRAO` em `lib/gamificacao.ts` ganham os dois campos,
para a config ser lida junto com o resto (uma leitura só).

### 3. Visão do gestor — página nova `/gestor/comissoes`

Server component, mesmo padrão das outras páginas do gestor (guard de perfil no
layout já existente). Elementos:

- **Seletor de mês/ano** — mesmo componente/padrão do "Ranking de Vendedores"
  do dashboard (querystring `?mes=&ano=`, default = mês atual).
- **Campo de regra** — dois inputs (% com meta / % sem meta) que salvam em
  `gam_config` via server action. Mostra a regra atual em texto.
- **Tabela** por vendedor: Vendedor · Vendido · Meta · Bateu? · % · Comissão.
  Rodapé com **Total a pagar**.
- **Exportar CSV** — reutiliza o padrão de export do projeto se existir; senão,
  um link/botão que gera CSV das linhas (para fechar o pagamento).

Reaproveita a leitura de vendido/meta por vendedor. Para evitar duplicar SQL,
extrair um helper `comissaoDoMes(supabase, ano, mes, config)` que devolve as
linhas por vendedor + total (usa `lancamentos` + `distribuicao_diaria`, como a
prévia SQL validada).

### 4. Visão do vendedor — card em `/painel/desempenho`

No "Meu Desempenho" do vendedor, um card:

- **"Sua comissão do mês: R$ X"**
- Linha de status: se bateu → "✅ Você bateu a meta → 2%"; se não →
  "Faltam R$ Y para sua comissão virar 2%".

Usa `calcularComissao` com o `valorMes`/`cotaMes` que a página já tem via
`calcularGamificacao`.

### 5. Menu — `components/sidebar-gestor.tsx`

Adicionar item `{ href: '/gestor/comissoes', label: 'Comissão', icon: Banknote }`
(lucide `Banknote` ou `DollarSign`) logo após "Gamificação".

## Fluxo de dados

```
gam_config (com_pct_meta, com_pct_sem)  ─┐
lancamentos.valor  ───► vendidoMes ──────┤
distribuicao_diaria.cota_valor ► metaMes ┴─► calcularComissao() ─► { comissao, % , bateu }
                                                     │
                          ┌──────────────────────────┴───────────┐
                     /gestor/comissoes (tabela+total+CSV)   /painel/desempenho (card do vendedor)
```

## Tratamento de erros / bordas

- Vendedor sem meta no mês (`meta = 0`) → 1%, sem marcar "bateu".
- Mês sem lançamentos → tabela vazia com aviso "Sem vendas no período".
- % inválida no formulário (negativa / vazia) → validar na server action e manter
  o valor anterior.
- Acesso a `/gestor/comissoes`: segue **o mesmo modelo das outras páginas
  `/gestor`** — o app só redireciona por perfil no login (`app/page.tsx`:
  gestor→/gestor, vendedor→/painel) e conta com o RLS do banco; **não há guard
  de perfil por página** hoje. Não vamos introduzir um guard só nesta página (seria
  inconsistente); a proteção real dos dados é o RLS. Fica registrado como dívida
  conhecida do app (endurecer o acesso a `/gestor/*` é assunto de outra fase).

## Testes

Unidade (`lib/comissao.test.ts`) sobre `calcularComissao`:

1. Vendido acima da meta → 2%, `bateu = true`, `faltaParaMeta = 0`.
2. Vendido abaixo da meta → 1%, `bateu = false`, `faltaParaMeta` correto.
3. Vendido exatamente = meta → conta como "bateu" (2%).
4. Meta = 0 → 1%, `bateu = false`.
5. Percentuais customizados (ex.: 3%/1,5%) aplicados corretamente.

Verificação manual: rodar local, logar como gestor, abrir `/gestor/comissoes`,
selecionar Julho/2026 e conferir contra a prévia (Iana R$ 794,33 / Andre
R$ 778,97 / total R$ 1.573,30).

## Fora de escopo (fases seguintes)

- Comissão/metas por categoria, marca, coleção ou aging (exige coletar venda por
  categoria — mudança no lançamento de dados).
- "Meu Desempenho Diário" em tempo real (Fase 2).
- Repaginação visual (Fase 3).
- Persistir/congelar a comissão paga por mês (histórico de pagamentos) — hoje é
  sempre recalculada sob demanda.
```
