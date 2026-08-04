# Comissão por Vendedor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar a comissão em R$ de cada vendedor (2% se bateu a meta do mês, 1% se não), para o gestor (página nova com seletor de mês e CSV) e para o vendedor (card no Meu Desempenho).

**Architecture:** Uma função pura calcula a comissão a partir de `vendido` e `meta`. Os valores de `vendido`/`meta` por vendedor já vêm de `calcularGamificacao()` (reuso — mesma definição de meta usada na gamificação). As duas % ficam em `gam_config` (2 colunas novas, configuráveis). Páginas server-component leem tudo e renderizam.

**Tech Stack:** Next.js 16 (App Router, Turbopack — server components + server actions), TypeScript, Supabase (Postgres remoto, projeto `aizttsmoaxcdccfszhyt`), Vitest 4 (testes de unidade de funções puras), Tailwind, lucide-react.

## Global Constraints

- **Next.js modificado:** o `AGENTS.md` do projeto avisa que este Next tem mudanças; `searchParams` chega como **Promise** e deve ser `await`-ado (padrão já usado em `app/gestor/historico/page.tsx`). Não presumir APIs de memória.
- **Sem banco local:** o Postgres é **remoto**. Migrations vão para o Supabase via a ferramenta MCP `apply_migration` (projeto `aizttsmoaxcdccfszhyt`) e o SQL também é salvo em `supabase/migrations/` para histórico.
- **Testes:** só de **função pura** com Vitest (`describe/it/expect`), no padrão de `lib/calculos.test.ts`. Não há `@testing-library/react`; não escrever testes de componente.
- **Moeda:** exibir com `formatBRL` de `@/lib/calculos`. Comissão arredondada a centavos (2 casas).
- **Definição de meta do vendedor:** `cotaMes` = soma de `distribuicao_diaria.cota_valor` do mês com `situacao = 'normal'` — **exatamente** como `lib/gamificacao.ts` já calcula. Não redefinir.
- **Segurança:** seguir o modelo atual das páginas `/gestor` (sem guard de perfil por página; proteção via RLS). Não adicionar guard novo só nesta página.

---

### Task 1: Lógica pura de comissão (`lib/comissao.ts`)

**Files:**
- Create: `lib/comissao.ts`
- Test: `lib/comissao.test.ts`

**Interfaces:**
- Consumes: nada (função pura, sem I/O).
- Produces:
  ```ts
  export type ConfigComissao = { pctComMeta: number; pctSemMeta: number }
  export type ResultadoComissao = {
    bateu: boolean
    percentual: number     // a % aplicada (ex.: 2)
    comissao: number       // R$, arredondado a 2 casas
    faltaParaMeta: number  // R$ que faltam p/ bater a meta (0 se bateu ou meta=0)
  }
  export function calcularComissao(vendido: number, meta: number, config: ConfigComissao): ResultadoComissao
  ```

- [ ] **Step 1: Escrever o teste que falha**

Create `lib/comissao.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { calcularComissao } from './comissao'

const cfg = { pctComMeta: 2, pctSemMeta: 1 }

describe('calcularComissao', () => {
  it('acima da meta aplica a % de meta batida (2%)', () => {
    const r = calcularComissao(39716.40, 30000, cfg)
    expect(r.bateu).toBe(true)
    expect(r.percentual).toBe(2)
    expect(r.comissao).toBe(794.33)
    expect(r.faltaParaMeta).toBe(0)
  })

  it('abaixo da meta aplica a % sem meta (1%) e informa quanto falta', () => {
    const r = calcularComissao(20000, 30000, cfg)
    expect(r.bateu).toBe(false)
    expect(r.percentual).toBe(1)
    expect(r.comissao).toBe(200)
    expect(r.faltaParaMeta).toBe(10000)
  })

  it('vendido exatamente igual à meta conta como bateu', () => {
    const r = calcularComissao(30000, 30000, cfg)
    expect(r.bateu).toBe(true)
    expect(r.percentual).toBe(2)
    expect(r.comissao).toBe(600)
  })

  it('meta zero (sem meta cadastrada) usa a % sem meta e não marca bateu', () => {
    const r = calcularComissao(5000, 0, cfg)
    expect(r.bateu).toBe(false)
    expect(r.percentual).toBe(1)
    expect(r.comissao).toBe(50)
    expect(r.faltaParaMeta).toBe(0)
  })

  it('respeita percentuais customizados', () => {
    const r = calcularComissao(10000, 8000, { pctComMeta: 3, pctSemMeta: 1.5 })
    expect(r.percentual).toBe(3)
    expect(r.comissao).toBe(300)
  })
})
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npx vitest run lib/comissao.test.ts`
Expected: FAIL — "Failed to resolve import './comissao'" / `calcularComissao is not defined`.

- [ ] **Step 3: Implementar o mínimo**

Create `lib/comissao.ts`:

```ts
export type ConfigComissao = { pctComMeta: number; pctSemMeta: number }

export type ResultadoComissao = {
  bateu: boolean
  percentual: number
  comissao: number
  faltaParaMeta: number
}

export function calcularComissao(
  vendido: number,
  meta: number,
  config: ConfigComissao,
): ResultadoComissao {
  const bateu = meta > 0 && vendido >= meta
  const percentual = bateu ? config.pctComMeta : config.pctSemMeta
  const comissao = Math.round(vendido * percentual) / 100
  const faltaParaMeta = bateu || meta <= 0 ? 0 : Math.max(meta - vendido, 0)
  return { bateu, percentual, comissao, faltaParaMeta }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run lib/comissao.test.ts`
Expected: PASS (5 testes).

- [ ] **Step 5: Commit**

```bash
git add lib/comissao.ts lib/comissao.test.ts
git commit -m "feat(comissao): funcao pura calcularComissao com testes"
```

---

### Task 2: Config das % em `gam_config` (migration + tipos)

**Files:**
- Create: `supabase/migrations/20260804_comissao_config.sql`
- Modify: `lib/gamificacao.ts` (type `Config` e `CONFIG_PADRAO`, ~linhas 14–72)
- Apply: migration no Supabase remoto via ferramenta MCP `apply_migration`

**Interfaces:**
- Consumes: `gam_config` (linha única `id = 1`).
- Produces: `Config` passa a incluir `com_pct_meta: number` e `com_pct_sem: number`; `calcularGamificacao()` continua retornando `config` — agora com esses campos preenchidos (default 2 e 1).

- [ ] **Step 1: Escrever o SQL da migration**

Create `supabase/migrations/20260804_comissao_config.sql`:

```sql
-- Comissão: duas percentagens configuráveis na config da gamificação.
alter table public.gam_config
  add column if not exists com_pct_meta numeric not null default 2,
  add column if not exists com_pct_sem  numeric not null default 1;
```

- [ ] **Step 2: Aplicar no Supabase remoto**

Aplicar o mesmo SQL no projeto `aizttsmoaxcdccfszhyt` (ferramenta MCP `apply_migration`, name `comissao_config`). Verificar com um `select com_pct_meta, com_pct_sem from gam_config where id = 1;` — deve retornar `2` e `1`.

- [ ] **Step 3: Estender o tipo `Config` e o default em `lib/gamificacao.ts`**

No `type Config` (após `pts_conv_baixa: number`) adicionar:

```ts
  com_pct_meta: number
  com_pct_sem: number
```

E no `CONFIG_PADRAO` (após `pts_conv_baixa: 20,`) adicionar:

```ts
  com_pct_meta: 2,
  com_pct_sem: 1,
```

(A leitura `supabase.from('gam_config').select('*')` já traz as colunas novas; nada mais muda em `calcularGamificacao`.)

- [ ] **Step 4: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260804_comissao_config.sql lib/gamificacao.ts
git commit -m "feat(comissao): colunas com_pct_meta/com_pct_sem em gam_config"
```

---

### Task 3: Página do gestor `/gestor/comissoes` (tabela + config + CSV + menu)

**Files:**
- Create: `app/gestor/comissoes/page.tsx`
- Create: `app/gestor/comissoes/actions.ts`
- Create: `components/botao-csv-comissao.tsx`
- Modify: `components/sidebar-gestor.tsx` (import de ícone + array `links`)

**Interfaces:**
- Consumes: `calcularComissao`, `ConfigComissao` (Task 1); `calcularGamificacao(supabase, ano, mes)` de `@/lib/gamificacao` → retorna `{ vendedores: VendedorGam[], config: Config }` onde cada `VendedorGam` tem `id, nome, valorMes, cotaMes`; `formatBRL` de `@/lib/calculos`.
- Produces: rota `/gestor/comissoes`; server action `salvarConfigComissao(formData: FormData): Promise<void>`.

- [ ] **Step 1: Server action para salvar as %**

Create `app/gestor/comissoes/actions.ts`:

```ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function salvarConfigComissao(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const num = (k: string, d: number) => {
    const v = Number(formData.get(k))
    return Number.isFinite(v) && v >= 0 ? v : d
  }
  await supabase
    .from('gam_config')
    .update({ com_pct_meta: num('com_pct_meta', 2), com_pct_sem: num('com_pct_sem', 1) })
    .eq('id', 1)

  revalidatePath('/gestor/comissoes')
  revalidatePath('/painel/desempenho')
}
```

- [ ] **Step 2: Botão de CSV (client component)**

Create `components/botao-csv-comissao.tsx`:

```tsx
'use client'

import { Button } from '@/components/ui/button'

export type LinhaCSV = {
  nome: string
  vendido: number
  meta: number
  bateu: boolean
  percentual: number
  comissao: number
}

export function BotaoCsvComissao({ linhas, nomeArquivo }: { linhas: LinhaCSV[]; nomeArquivo: string }) {
  function baixar() {
    const cab = ['Vendedor', 'Vendido', 'Meta', 'Bateu meta', '% Comissao', 'Comissao']
    const num = (n: number) => n.toFixed(2).replace('.', ',')
    const linhasCsv = linhas.map((l) =>
      [l.nome, num(l.vendido), num(l.meta), l.bateu ? 'Sim' : 'Nao', num(l.percentual), num(l.comissao)].join(';'),
    )
    const csv = [cab.join(';'), ...linhasCsv].join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = nomeArquivo
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={baixar} disabled={linhas.length === 0}>
      Exportar CSV
    </Button>
  )
}
```

- [ ] **Step 3: Página do gestor**

Create `app/gestor/comissoes/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server'
import { calcularGamificacao } from '@/lib/gamificacao'
import { calcularComissao } from '@/lib/comissao'
import { formatBRL } from '@/lib/calculos'
import { salvarConfigComissao } from './actions'
import { BotaoCsvComissao, type LinhaCSV } from '@/components/botao-csv-comissao'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

export default async function ComissoesPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; ano?: string }>
}) {
  const sp = await searchParams
  const supabase = await createClient()
  const hoje = new Date()
  const ano = Number(sp.ano ?? hoje.getFullYear())
  const mes = Number(sp.mes ?? hoje.getMonth() + 1)
  const anos = Array.from(new Set([hoje.getFullYear(), hoje.getFullYear() - 1, ano])).sort((a, b) => b - a)

  const { vendedores, config } = await calcularGamificacao(supabase, ano, mes)
  const cfg = { pctComMeta: Number(config.com_pct_meta), pctSemMeta: Number(config.com_pct_sem) }

  const linhas = vendedores
    .map((v) => {
      const r = calcularComissao(v.valorMes, v.cotaMes, cfg)
      return { id: v.id, nome: v.nome, vendido: v.valorMes, meta: v.cotaMes, ...r }
    })
    .sort((a, b) => b.comissao - a.comissao)

  const totalComissao = linhas.reduce((s, l) => s + l.comissao, 0)
  const csv: LinhaCSV[] = linhas.map((l) => ({
    nome: l.nome, vendido: l.vendido, meta: l.meta, bateu: l.bateu, percentual: l.percentual, comissao: l.comissao,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Comissão — {MESES[mes - 1]}/{ano}</h1>
        <p className="text-sm text-zinc-400">
          {cfg.pctComMeta}% se bateu a meta · {cfg.pctSemMeta}% se não bateu · Total a pagar:{' '}
          <span className="font-semibold text-foreground">R$ {formatBRL(totalComissao)}</span>
        </p>
      </div>

      {/* Seletor de mês/ano + regra + CSV */}
      <Card className="border-slate-800 bg-slate-900">
        <CardContent className="pt-6 flex flex-wrap items-end justify-between gap-4">
          <form method="get" className="flex items-end gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-slate-400">Mês</Label>
              <select name="mes" defaultValue={mes} className="rounded-md bg-slate-800 border border-slate-700 px-2 py-1.5 text-sm">
                {MESES.map((nome, i) => <option key={i} value={i + 1}>{nome}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-400">Ano</Label>
              <select name="ano" defaultValue={ano} className="rounded-md bg-slate-800 border border-slate-700 px-2 py-1.5 text-sm">
                {anos.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <Button type="submit" size="sm" variant="outline">Ver</Button>
          </form>

          <form action={salvarConfigComissao} className="flex items-end gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-slate-400">% com meta</Label>
              <Input name="com_pct_meta" type="number" step="0.1" min="0" defaultValue={cfg.pctComMeta} className="bg-slate-800 border-slate-700 h-9 w-24" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-400">% sem meta</Label>
              <Input name="com_pct_sem" type="number" step="0.1" min="0" defaultValue={cfg.pctSemMeta} className="bg-slate-800 border-slate-700 h-9 w-24" />
            </div>
            <Button type="submit" size="sm" className="bg-zinc-100 text-zinc-950 hover:bg-white font-medium">Salvar regra</Button>
          </form>

          <BotaoCsvComissao linhas={csv} nomeArquivo={`comissao_${ano}-${String(mes).padStart(2, '0')}.csv`} />
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card className="border-slate-800 bg-slate-900">
        <CardContent className="pt-6">
          {linhas.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">Nenhuma venda no período selecionado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendedor</TableHead>
                  <TableHead className="text-right">Vendido</TableHead>
                  <TableHead className="text-right">Meta</TableHead>
                  <TableHead className="text-center">Bateu?</TableHead>
                  <TableHead className="text-right">%</TableHead>
                  <TableHead className="text-right">Comissão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.nome}</TableCell>
                    <TableCell className="text-right">R$ {formatBRL(l.vendido)}</TableCell>
                    <TableCell className="text-right text-slate-400">R$ {formatBRL(l.meta)}</TableCell>
                    <TableCell className="text-center">{l.bateu ? '✅' : '—'}</TableCell>
                    <TableCell className="text-right text-slate-400">{l.percentual}%</TableCell>
                    <TableCell className="text-right font-semibold">R$ {formatBRL(l.comissao)}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={5} className="text-right font-semibold">Total a pagar</TableCell>
                  <TableCell className="text-right font-bold text-green-400">R$ {formatBRL(totalComissao)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 4: Adicionar "Comissão" no menu**

In `components/sidebar-gestor.tsx`: adicionar `Banknote` à lista de imports de `lucide-react` (junto de `Trophy`), e inserir no array `links`, logo após a linha de `/gestor/gamificacao`:

```tsx
  { href: '/gestor/comissoes', label: 'Comissão', icon: Banknote },
```

- [ ] **Step 5: Verificar tipos e lint**

Run: `npx tsc --noEmit && npx eslint app/gestor/comissoes components/botao-csv-comissao.tsx components/sidebar-gestor.tsx`
Expected: sem erros.

- [ ] **Step 6: Verificação manual**

Rodar `npm run dev`, logar como gestor, abrir `/gestor/comissoes`, escolher **Julho / 2026** → conferir: Iana R$ 794,33 · Andre R$ 778,97 · Total R$ 1.573,30. Trocar "% com meta" para 3, Salvar → comissões recalculam. Exportar CSV → abre no Excel com as colunas certas.

- [ ] **Step 7: Commit**

```bash
git add app/gestor/comissoes components/botao-csv-comissao.tsx components/sidebar-gestor.tsx
git commit -m "feat(comissao): pagina /gestor/comissoes com seletor de mes, regra e CSV"
```

---

### Task 4: Card de comissão no "Meu Desempenho" do vendedor

**Files:**
- Modify: `app/painel/desempenho/page.tsx`

**Interfaces:**
- Consumes: `calcularComissao` (Task 1); `calcularGamificacao` já é chamado nessa página e retorna `{ vendedores, config }`; o vendedor logado é `eu` (tem `valorMes`, `cotaMes`).
- Produces: card visível para o vendedor com a comissão do mês.

- [ ] **Step 1: Importar e calcular a comissão do vendedor logado**

In `app/painel/desempenho/page.tsx`:

Adicionar aos imports:

```tsx
import { calcularComissao } from '@/lib/comissao'
```

Mudar a desestruturação do resultado para também pegar `config`:

```tsx
const { vendedores, config } = await calcularGamificacao(supabase, ano, mes)
```

Depois de obter `eu` (e do early-return quando `!eu`), calcular:

```tsx
const comissao = calcularComissao(eu.valorMes, eu.cotaMes, {
  pctComMeta: Number(config.com_pct_meta),
  pctSemMeta: Number(config.com_pct_sem),
})
```

- [ ] **Step 2: Renderizar o card**

Inserir este card logo após o card "Nível e pontos" (antes do card "De onde vêm seus pontos"):

```tsx
      {/* Comissão do mês */}
      <Card className="border-slate-800 bg-slate-900">
        <CardHeader><CardTitle className="text-base">💵 Sua comissão do mês</CardTitle></CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-green-400">R$ {formatBRL(comissao.comissao)}</p>
          <p className="text-sm text-slate-400 mt-1">
            {comissao.bateu
              ? `✅ Você bateu a meta → ${comissao.percentual}% sobre R$ ${formatBRL(eu.valorMes)}`
              : `${comissao.percentual}% sobre R$ ${formatBRL(eu.valorMes)} · faltam R$ ${formatBRL(comissao.faltaParaMeta)} para virar ${Number(config.com_pct_meta)}%`}
          </p>
        </CardContent>
      </Card>
```

(`Card`, `CardContent`, `CardHeader`, `CardTitle` e `formatBRL` já estão importados nessa página.)

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Verificação manual**

Rodar `npm run dev`, logar como um vendedor (ex.: Iana), abrir "Meu Desempenho": o card deve mostrar a comissão do mês corrente com o texto de meta batida / quanto falta.

- [ ] **Step 5: Commit**

```bash
git add app/painel/desempenho/page.tsx
git commit -m "feat(comissao): card de comissao no Meu Desempenho do vendedor"
```

---

## Self-Review

**1. Cobertura do spec:**
- Lógica pura 2%/1% configurável → Task 1 + Task 2. ✅
- Config em `gam_config` (2 colunas) → Task 2. ✅
- Página do gestor com seletor de mês, tabela, total, CSV, ajuste de % → Task 3. ✅
- Card do vendedor no Meu Desempenho → Task 4. ✅
- Item no menu → Task 3, Step 4. ✅
- Testes de unidade (5 casos) → Task 1. ✅
- Bordas: mês sem vendas (aviso na tabela — Task 3 Step 3), meta 0 → 1% (Task 1 caso 4), % inválida (validação `v >= 0` na action — Task 3 Step 1). ✅
- Fora de escopo (categoria, diário, visual, histórico de pagamento) → não implementado. ✅

**2. Placeholders:** nenhum — todos os steps têm código real.

**3. Consistência de tipos:** `ConfigComissao {pctComMeta, pctSemMeta}` definido na Task 1 e usado nas Tasks 3 e 4 mapeando de `config.com_pct_meta`/`com_pct_sem` (colunas criadas na Task 2). `calcularComissao(vendido, meta, config)` com a mesma assinatura em todos os usos. `VendedorGam.valorMes/cotaMes` e `Config.com_pct_meta/com_pct_sem` conferem com `lib/gamificacao.ts`. `LinhaCSV` definido em `botao-csv-comissao.tsx` e importado na página. ✅
