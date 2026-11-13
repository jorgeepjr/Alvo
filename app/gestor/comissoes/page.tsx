import { createClient } from '@/lib/supabase/server'
import { calcularGamificacao } from '@/lib/gamificacao'
import { calcularComissao } from '@/lib/comissao'
import { formatBRL } from '@/lib/calculos'
import { salvarConfigComissao } from './actions'
import { BotaoCsvComissao, type LinhaCSV } from '@/components/botao-csv-comissao'
import { mesSelecionado } from '@/lib/mes-selecionado'
import { anoDe, hojeBR, mesDe, ymDe, addMes } from '@/lib/datas'
import { TopoPagina } from '@/components/topo-pagina'
import { Aviso } from '@/components/bloco-mes'
import { Card, CardContent } from '@/components/ui/card'
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
  // Seletor de mês único (vale pra tela toda). Aceita também o link antigo ?mes=11&ano=2026.
  const ym = sp.ano ? `${sp.ano}-${String(sp.mes ?? 1).padStart(2, '0')}` : await mesSelecionado(sp)
  const ano = anoDe(ym)
  const mes = mesDe(ym)
  const fechado = ym < ymDe(hojeBR())

  const { vendedores, config } = await calcularGamificacao(supabase, ano, mes, true)
  const cfg = { pctComMeta: Number(config.com_pct_meta), pctSemMeta: Number(config.com_pct_sem) }

  const linhas = vendedores
    .map((v) => {
      const r = calcularComissao(v.valorMes, v.cotaMes, cfg)
      return { id: v.id, nome: v.nome, vendido: v.valorMes, meta: v.cotaMes, ...r }
    })
    .filter((l) => l.vendido > 0 || l.meta > 0)
    .sort((a, b) => b.comissao - a.comissao)

  const totalComissao = linhas.reduce((s, l) => s + l.comissao, 0)
  const csv: LinhaCSV[] = linhas.map((l) => ({
    nome: l.nome, vendido: l.vendido, meta: l.meta, bateu: l.bateu, percentual: l.percentual, comissao: l.comissao,
  }))

  return (
    <div className="space-y-6">
      <TopoPagina area="Metas" titulo="Comissão" ym={ym} ajuda="/gestor/ajuda#comissao" descricao={<>O fechamento do mês: <b className="text-slate-200">quanto cada vendedor recebe</b>.</>} />
      {fechado ? (
        <Aviso tom="ok" icone="📋" titulo={`${MESES[mes - 1]}/${ano} fechado`}>Esses são os valores pra pagar.</Aviso>
      ) : (
        <Aviso tom="warn" icone="⏳" titulo={`${MESES[mes - 1]}/${ano} ainda está em andamento`} acao={{ href: `/gestor/comissoes?mes=${addMes(ym, -1)}`, texto: 'Ver mês anterior →' }}>Valor parcial: muda até o último dia do mês.</Aviso>
      )}
      <div>
        <p className="text-sm text-zinc-400">
          {cfg.pctComMeta}% se bateu a meta · {cfg.pctSemMeta}% se não bateu · Total a pagar:{' '}
          <span className="font-semibold text-foreground">R$ {formatBRL(totalComissao)}</span>
        </p>
      </div>

      {/* Regra + CSV */}
      <Card className="border-slate-800 bg-slate-900">
        <CardContent className="pt-6 flex flex-wrap items-end justify-between gap-4">
          <span className="text-sm text-slate-400">Regra da comissão:</span>

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
