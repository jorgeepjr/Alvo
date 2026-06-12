import { buscarHistorico, buscarComparativoCompleto, consolidarMesAtual } from './actions'
import { HistoricoTable } from '@/components/historico-table'
import { ComparativoTable } from '@/components/comparativo-table'
import { CrescimentoChart } from '@/components/crescimento-chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function HistoricoPage({ searchParams }: { searchParams: Promise<{ metrica?: 'valor' | 'atendimentos' | 'pecas' }> }) {
  const sp = await searchParams
  const metrica = sp.metrica ?? 'valor'
  const { vendas, cotas, series } = await buscarHistorico(metrica)
  const comparativo = await buscarComparativoCompleto()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Histórico Anual</h1>

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
