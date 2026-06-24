import { createClient } from '@/lib/supabase/server'
import { calcularProjecao, calcularTicketMedio } from '@/lib/calculos'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { notFound } from 'next/navigation'
import { editarVendedor } from '../actions'
import { BarrasChart } from '@/components/barras-chart'

const MESES_CURTO = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export default async function VendedorDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: vendedor } = await supabase.from('profiles').select('*').eq('id', id).single()
  if (!vendedor) notFound()

  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = hoje.getMonth() + 1
  const inicioMes = `${ano}-${String(mes).padStart(2, '0')}-01`
  const ultimoDia = new Date(ano, mes, 0).getDate()
  const fimMes = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`

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

  // Evolução dos últimos 12 meses (vendas do vendedor por mês)
  const inicio12 = new Date(ano, mes - 12, 1)
  const inicio12Str = `${inicio12.getFullYear()}-${String(inicio12.getMonth() + 1).padStart(2, '0')}-01`
  const { data: lanc12 } = await supabase
    .from('lancamentos')
    .select('data, valor')
    .eq('vendedor_id', id)
    .gte('data', inicio12Str)
    .lte('data', fimMes)
  const mapaMes = new Map<string, number>()
  for (const l of lanc12 ?? []) {
    const chave = l.data.slice(0, 7) // YYYY-MM
    mapaMes.set(chave, (mapaMes.get(chave) ?? 0) + Number(l.valor))
  }
  const evolucao = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(ano, mes - 12 + i, 1)
    const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    return { label: `${MESES_CURTO[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`, valor: Math.round(mapaMes.get(chave) ?? 0) }
  })

  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: authData } = await admin.auth.admin.getUserById(id)
  const email = authData?.user?.email ?? ''

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{vendedor.nome}</h1>

      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle className="text-base">Editar Vendedor</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={editarVendedor.bind(null, id)} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div className="space-y-1">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" name="nome" defaultValue={vendedor.nome} required className="bg-slate-800 border-slate-700" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" defaultValue={email} className="bg-slate-800 border-slate-700" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="senha">Nova senha (opcional)</Label>
              <Input id="senha" name="senha" type="password" placeholder="deixe em branco para manter" className="bg-slate-800 border-slate-700" />
            </div>
            <Button type="submit" className="bg-zinc-100 text-zinc-950 hover:bg-white font-medium">Salvar</Button>
          </form>
        </CardContent>
      </Card>

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

      <Card className="border-slate-800 bg-slate-900">
        <CardHeader><CardTitle className="text-base">Evolução — últimos 12 meses</CardTitle></CardHeader>
        <CardContent>
          <BarrasChart dados={evolucao} destaque={`${MESES_CURTO[mes - 1]}/${String(ano).slice(2)}`} />
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
