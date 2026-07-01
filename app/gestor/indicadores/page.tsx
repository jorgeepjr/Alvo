import { createClient } from '@/lib/supabase/server'
import { formatBRL } from '@/lib/calculos'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function div(a: number, b: number) {
  return b > 0 ? a / b : 0
}

export default async function IndicadoresPage() {
  const supabase = await createClient()
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = hoje.getMonth() + 1
  const inicioMes = `${ano}-${String(mes).padStart(2, '0')}-01`
  const ultimoDia = new Date(ano, mes, 0).getDate()
  const fimMes = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`

  const { data: lanc } = await supabase
    .from('lancamentos')
    .select('vendedor_id, atendimentos, vendas, pecas, valor')
    .gte('data', inicioMes)
    .lte('data', fimMes)

  const { data: vendedores } = await supabase.from('profiles').select('id, nome').eq('perfil', 'vendedor').eq('ativo', true).order('nome')

  const soma = (arr: typeof lanc, campo: 'atendimentos' | 'vendas' | 'pecas' | 'valor') =>
    (arr ?? []).reduce((a, l) => a + Number(l[campo] ?? 0), 0)

  const faturamento = soma(lanc, 'valor')
  const atendimentos = soma(lanc, 'atendimentos')
  const vendas = soma(lanc, 'vendas')
  const pecas = soma(lanc, 'pecas')

  const conversao = div(vendas, atendimentos) * 100
  const ticketVenda = div(faturamento, vendas)
  const ticketCliente = div(faturamento, atendimentos)
  const pecasPorVenda = div(pecas, vendas)

  const cards = [
    { titulo: 'Faturamento', valor: `R$ ${formatBRL(faturamento)}`, desc: 'Quanto a loja vendeu no mês.' },
    { titulo: 'Taxa de Conversão', valor: `${conversao.toFixed(1)}%`, desc: 'De cada 100 pessoas atendidas, quantas compraram (vendas ÷ atendimentos).' },
    { titulo: 'Ticket Médio (por venda)', valor: `R$ ${formatBRL(ticketVenda)}`, desc: 'Quanto cada venda deixou em média (faturamento ÷ nº de vendas).' },
    { titulo: 'Peças por Venda', valor: pecasPorVenda.toFixed(2), desc: 'Quantas peças em média por venda. Subir isso aumenta o ticket.' },
    { titulo: 'Ticket Médio (por cliente)', valor: `R$ ${formatBRL(ticketCliente)}`, desc: 'Média por pessoa atendida (faturamento ÷ atendimentos).' },
    { titulo: 'Atendimentos / Vendas', valor: `${atendimentos} / ${vendas}`, desc: 'Total de pessoas atendidas e de vendas fechadas no mês.' },
  ]

  // Por vendedor
  const porVendedor = (vendedores ?? []).map((v) => {
    const lv = (lanc ?? []).filter((l) => l.vendedor_id === v.id)
    const fat = lv.reduce((a, l) => a + Number(l.valor ?? 0), 0)
    const at = lv.reduce((a, l) => a + Number(l.atendimentos ?? 0), 0)
    const vd = lv.reduce((a, l) => a + Number(l.vendas ?? 0), 0)
    const pc = lv.reduce((a, l) => a + Number(l.pecas ?? 0), 0)
    return {
      nome: v.nome,
      conversao: div(vd, at) * 100,
      ticket: div(fat, vd),
      pecasVenda: div(pc, vd),
      fat,
    }
  })

  const temVendas = vendas > 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Indicadores — {MESES[mes - 1]}/{ano}</h1>
        <p className="text-sm text-zinc-400">Os números que mostram a saúde das vendas. Quem mede, lidera.</p>
      </div>

      {!temVendas && (
        <Card className="border-yellow-800 bg-yellow-950/20">
          <CardContent className="py-3 text-sm text-yellow-300">
            Para a Taxa de Conversão e o Ticket por Venda, registre o campo <b>&quot;Vendas (nº)&quot;</b> nos lançamentos
            (quantos atendimentos viraram compra). Sem isso, esses indicadores ficam zerados.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Card key={c.titulo} className="border-slate-800 bg-slate-900">
            <CardHeader><CardTitle className="text-sm text-slate-400">{c.titulo}</CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{c.valor}</p>
              <p className="text-xs text-slate-500 mt-1">{c.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-slate-800 bg-slate-900">
        <CardHeader><CardTitle className="text-base">Por Vendedor</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendedor</TableHead>
                <TableHead>Faturamento</TableHead>
                <TableHead>Conversão</TableHead>
                <TableHead>Ticket / venda</TableHead>
                <TableHead>Peças / venda</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {porVendedor.map((v) => (
                <TableRow key={v.nome}>
                  <TableCell>{v.nome}</TableCell>
                  <TableCell>R$ {formatBRL(v.fat)}</TableCell>
                  <TableCell>{v.conversao.toFixed(1)}%</TableCell>
                  <TableCell>R$ {formatBRL(v.ticket)}</TableCell>
                  <TableCell>{v.pecasVenda.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
