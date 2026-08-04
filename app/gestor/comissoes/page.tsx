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
