import { createClient } from '@/lib/supabase/server'
import { calcularProjecao, calcularTicketMedio } from '@/lib/calculos'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { notFound } from 'next/navigation'

export default async function VendedorDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: vendedor } = await supabase.from('profiles').select('*').eq('id', id).single()
  if (!vendedor) notFound()

  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = hoje.getMonth() + 1
  const inicioMes = `${ano}-${String(mes).padStart(2, '0')}-01`
  const fimMes = `${ano}-${String(mes).padStart(2, '0')}-31`

  const { data: lancamentos } = await supabase
    .from('lancamentos')
    .select('*')
    .eq('vendedor_id', id)
    .gte('data', inicioMes)
    .lte('data', fimMes)

  const { data: distribuicoes } = await supabase
    .from('distribuicao_diaria')
    .select('*')
    .eq('vendedor_id', id)
    .gte('data', inicioMes)
    .lte('data', fimMes)

  const valorVendido = lancamentos?.reduce((acc, l) => acc + Number(l.valor), 0) ?? 0
  const valorCota = distribuicoes?.reduce((acc, d) => acc + Number(d.cota_valor), 0) ?? 0
  const atendimentos = lancamentos?.reduce((acc, l) => acc + l.atendimentos, 0) ?? 0
  const pecas = lancamentos?.reduce((acc, l) => acc + l.pecas, 0) ?? 0
  const diasTrabalhados = lancamentos?.filter((l) => l.situacao_vendedor === 'normal').length ?? 0
  const totalDiasUteis = distribuicoes?.filter((d) => d.situacao === 'normal').length ?? 0
  const projecao = calcularProjecao(valorVendido, diasTrabalhados, totalDiasUteis)
  const ticketCliente = calcularTicketMedio(valorVendido, atendimentos)
  const ticketPeca = calcularTicketMedio(valorVendido, pecas)
  const percentual = valorCota > 0 ? (valorVendido / valorCota) * 100 : 0

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{vendedor.nome}</h1>

      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle className="text-base">Progresso do Mês</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>R$ {valorVendido.toFixed(2)} / R$ {valorCota.toFixed(2)}</span>
            <span>{percentual.toFixed(1)}%</span>
          </div>
          <Progress value={Math.min(percentual, 100)} />
          <p className="text-sm text-slate-400">
            Projeção: R$ {projecao.toFixed(2)} ({valorCota > 0 ? ((projecao / valorCota) * 100).toFixed(1) : '0'}% da meta)
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-800 bg-slate-900">
          <CardHeader><CardTitle className="text-sm text-slate-400">Atendimentos</CardTitle></CardHeader>
          <CardContent className="text-xl font-bold">{atendimentos}</CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-900">
          <CardHeader><CardTitle className="text-sm text-slate-400">Peças</CardTitle></CardHeader>
          <CardContent className="text-xl font-bold">{pecas}</CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-900">
          <CardHeader><CardTitle className="text-sm text-slate-400">Ticket Médio</CardTitle></CardHeader>
          <CardContent className="text-xl font-bold">
            R$ {ticketCliente.toFixed(2)} / cliente · R$ {ticketPeca.toFixed(2)} / peça
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
