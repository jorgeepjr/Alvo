import { buscarHistorico, buscarComparativoCompleto, buscarHistoricoVisual, consolidarMesAtual } from './actions'
import { HistoricoTable } from '@/components/historico-table'
import { ComparativoTable } from '@/components/comparativo-table'
import { CrescimentoChart } from '@/components/crescimento-chart'
import { BarrasChart } from '@/components/barras-chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

const MESES_NOME = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

export default async function HistoricoPage({ searchParams }: { searchParams: Promise<{ metrica?: 'valor' | 'atendimentos' | 'pecas'; ano?: string; mes?: string }> }) {
  const sp = await searchParams
  const metrica = sp.metrica ?? 'valor'
  const { vendas, cotas, series } = await buscarHistorico(metrica)
  const comparativo = await buscarComparativoCompleto()

  const hoje = new Date()
  const anoSel = Number(sp.ano ?? hoje.getFullYear())
  const mesSel = Number(sp.mes ?? hoje.getMonth() + 1)
  const visual = await buscarHistoricoVisual(anoSel, mesSel)
  const totalAnoSel = visual.porMes.reduce((a, m) => a + m.valor, 0)
  const totalMesSel = visual.porDia.reduce((a, d) => a + d.valor, 0)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Histórico Anual</h1>

      <Card className="border-slate-800 bg-slate-900">
        <CardHeader><CardTitle className="text-base">Faturamento por Ano</CardTitle></CardHeader>
        <CardContent>
          <BarrasChart dados={visual.porAno} destaque={String(anoSel)} />
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Faturamento por Mês — {anoSel}</CardTitle>
            <div className="flex gap-1">
              {visual.anosDisponiveis.map((a) => (
                <Link key={a} href={`/gestor/historico?ano=${a}&mes=${mesSel}`}>
                  <Button size="sm" variant={a === anoSel ? 'default' : 'outline'}>{a}</Button>
                </Link>
              ))}
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-1">Total do ano: R$ {totalAnoSel.toLocaleString('pt-BR')}</p>
        </CardHeader>
        <CardContent>
          <BarrasChart dados={visual.porMes} destaque={['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][mesSel - 1]} />
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Vendas por Dia — {MESES_NOME[mesSel - 1]}/{anoSel}</CardTitle>
            <form className="flex gap-1" method="get">
              <input type="hidden" name="ano" value={anoSel} />
              <select name="mes" defaultValue={mesSel} className="rounded-md bg-slate-800 border border-slate-700 px-2 py-1 text-sm">
                {MESES_NOME.map((nome, i) => (
                  <option key={i} value={i + 1}>{nome}</option>
                ))}
              </select>
              <Button type="submit" size="sm" variant="outline">Ver</Button>
            </form>
          </div>
          <p className="text-xs text-slate-400 mt-1">Total do mês: R$ {totalMesSel.toLocaleString('pt-BR')}</p>
        </CardHeader>
        <CardContent>
          <BarrasChart dados={visual.porDia} />
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Link href="/gestor/historico?metrica=valor"><Button variant={metrica === 'valor' ? 'default' : 'outline'} size="sm">Valor</Button></Link>
        <Link href="/gestor/historico?metrica=atendimentos"><Button variant={metrica === 'atendimentos' ? 'default' : 'outline'} size="sm">Atendimentos</Button></Link>
        <Link href="/gestor/historico?metrica=pecas"><Button variant={metrica === 'pecas' ? 'default' : 'outline'} size="sm">Peças</Button></Link>
        <form action={consolidarMesAtual}>
          <Button type="submit" variant="outline" size="sm">Consolidar Mês Atual</Button>
        </form>
      </div>

      <Card className="border-slate-800 bg-slate-900">
        <CardHeader><CardTitle className="text-base">Crescimento Acumulado por Ano</CardTitle></CardHeader>
        <CardContent>
          <CrescimentoChart series={series} />
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-900">
        <CardHeader><CardTitle className="text-base">Comparativo Mês a Mês — Valor (R$)</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <ComparativoTable anos={comparativo.valor.anos} linhas={comparativo.valor.linhas} metrica="valor" />
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-900">
        <CardHeader><CardTitle className="text-base">Comparativo Mês a Mês — Atendimentos</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <ComparativoTable anos={comparativo.atendimentos.anos} linhas={comparativo.atendimentos.linhas} metrica="atendimentos" />
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-900">
        <CardHeader><CardTitle className="text-base">Comparativo Mês a Mês — Peças</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <ComparativoTable anos={comparativo.pecas.anos} linhas={comparativo.pecas.linhas} metrica="pecas" />
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-900">
        <CardHeader><CardTitle className="text-base">Vendas vs. Cota — {metrica}</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <HistoricoTable vendas={vendas} cotas={cotas} />
        </CardContent>
      </Card>
    </div>
  )
}
