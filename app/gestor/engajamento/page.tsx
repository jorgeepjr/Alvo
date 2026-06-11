import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default async function EngajamentoPage() {
  const supabase = await createClient()

  const hoje = new Date()
  const hojeStr = hoje.toISOString().slice(0, 10)
  const data7diasAtras = new Date(hoje)
  data7diasAtras.setDate(hoje.getDate() - 6)
  const inicioStr = data7diasAtras.toISOString().slice(0, 10)

  const { data: vendedores } = await supabase
    .from('profiles')
    .select('id, nome')
    .eq('perfil', 'vendedor')
    .eq('ativo', true)
    .order('nome')

  // Total de itens de rotina por dia da semana
  const { data: rotinaModelo } = await supabase.from('rotina_modelo').select('id, dia_semana, atribuido_a')

  // Conclusões dos últimos 7 dias
  const { data: concluidas } = await supabase
    .from('rotina_concluida')
    .select('vendedor_id, data, item_id')
    .gte('data', inicioStr)
    .lte('data', hojeStr)

  const dias: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(data7diasAtras)
    d.setDate(data7diasAtras.getDate() + i)
    dias.push(d.toISOString().slice(0, 10))
  }

  const vendedoresAtivos = vendedores ?? []

  function totalItensParaDia(dataStr: string, indiceVendedor: number) {
    const diaSemana = new Date(dataStr + 'T12:00:00').getDay()
    const minhaMetade = indiceVendedor % 2
    return (rotinaModelo ?? []).filter(
      (r) => r.dia_semana === diaSemana && (r.atribuido_a === null || r.atribuido_a === minhaMetade)
    ).length
  }

  function totalConcluidas(vendedorId: string, dataStr: string) {
    return (concluidas ?? []).filter((c) => c.vendedor_id === vendedorId && c.data === dataStr).length
  }

  // Mensagens recentes do assistente IA
  const { data: mensagens } = await supabase
    .from('assistente_mensagens')
    .select('vendedor_id, pergunta, resposta, criado_em')
    .order('criado_em', { ascending: false })
    .limit(20)

  const nomeVendedor = (id: string) => vendedoresAtivos.find((v) => v.id === id)?.nome ?? '—'

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Engajamento da Equipe</h1>
      <p className="text-sm text-slate-400">
        Acompanhe o cumprimento da rotina diária de cada vendedor e veja as últimas perguntas feitas ao
        Assistente IA (podem trazer ideias de melhoria).
      </p>

      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle className="text-base">Rotina concluída (últimos 7 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendedor</TableHead>
                {dias.map((d) => (
                  <TableHead key={d}>{d.split('-').reverse().slice(0, 2).join('/')}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendedoresAtivos.map((v, idx) => (
                <TableRow key={v.id}>
                  <TableCell>{v.nome}</TableCell>
                  {dias.map((d) => {
                    const total = totalItensParaDia(d, idx)
                    const feitas = totalConcluidas(v.id, d)
                    const ok = total > 0 && feitas >= total
                    return (
                      <TableCell key={d} className={ok ? 'text-green-400' : feitas > 0 ? 'text-yellow-400' : 'text-slate-500'}>
                        {total > 0 ? `${feitas}/${total}` : '—'}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle className="text-base">Últimas conversas com o Assistente IA</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(!mensagens || mensagens.length === 0) && (
            <p className="text-sm text-slate-400">Nenhuma conversa registrada ainda.</p>
          )}
          {mensagens?.map((m, i) => (
            <div key={i} className="border border-slate-800 rounded-md p-3 space-y-1">
              <p className="text-xs text-slate-500">
                {nomeVendedor(m.vendedor_id)} — {new Date(m.criado_em).toLocaleString('pt-BR')}
              </p>
              <p className="text-sm text-slate-200">
                <span className="font-semibold">Pergunta:</span> {m.pergunta}
              </p>
              <p className="text-sm text-slate-400 whitespace-pre-wrap">
                <span className="font-semibold">Resposta:</span> {m.resposta}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
