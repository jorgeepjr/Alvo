import { createClient } from '@/lib/supabase/server'
import { calcularProjecao, calcularTicketMedio } from '@/lib/calculos'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProgressBar } from '@/components/progress-bar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { alternarConclusaoTarefa, alternarItemRotina } from '@/app/gestor/tarefas/actions'
import { fraseDoDia } from '@/lib/frases-motivacionais'

function inicioFimSemana(data: Date): { inicio: string; fim: string } {
  const dia = data.getDay()
  const inicio = new Date(data)
  inicio.setDate(data.getDate() - dia)
  const fim = new Date(inicio)
  fim.setDate(inicio.getDate() + 6)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return { inicio: fmt(inicio), fim: fmt(fim) }
}

export default async function PainelVendedor() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single()

  const hoje = new Date()
  const hojeStr = hoje.toISOString().slice(0, 10)
  const ano = hoje.getFullYear()
  const mes = hoje.getMonth() + 1
  const inicioMes = `${ano}-${String(mes).padStart(2, '0')}-01`
  const ultimoDia = new Date(ano, mes, 0).getDate()
  const fimMes = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`
  const { inicio: inicioSemana, fim: fimSemana } = inicioFimSemana(hoje)

  const { data: lancHoje } = await supabase.from('lancamentos').select('*').eq('vendedor_id', user!.id).eq('data', hojeStr).maybeSingle()
  const { data: cotaHoje } = await supabase.from('distribuicao_diaria').select('*').eq('vendedor_id', user!.id).eq('data', hojeStr).maybeSingle()

  const { data: lancSemana } = await supabase.from('lancamentos').select('*').eq('vendedor_id', user!.id).gte('data', inicioSemana).lte('data', fimSemana)
  const { data: cotaSemana } = await supabase.from('distribuicao_diaria').select('*').eq('vendedor_id', user!.id).gte('data', inicioSemana).lte('data', fimSemana)

  const { data: lancMes } = await supabase.from('lancamentos').select('*').eq('vendedor_id', user!.id).gte('data', inicioMes).lte('data', fimMes).order('data')
  const { data: cotaMes } = await supabase.from('distribuicao_diaria').select('*').eq('vendedor_id', user!.id).gte('data', inicioMes).lte('data', fimMes)

  const valorHoje = Number(lancHoje?.valor ?? 0)
  const cotaValorHoje = Number(cotaHoje?.cota_valor ?? 0)
  const faltaHoje = cotaValorHoje - valorHoje

  const valorSemana = lancSemana?.reduce((acc, l) => acc + Number(l.valor), 0) ?? 0
  const cotaValorSemana = cotaSemana?.reduce((acc, d) => acc + Number(d.cota_valor), 0) ?? 0

  const valorMes = lancMes?.reduce((acc, l) => acc + Number(l.valor), 0) ?? 0
  const cotaValorMes = cotaMes?.reduce((acc, d) => acc + Number(d.cota_valor), 0) ?? 0
  const diasTrabalhados = lancMes?.filter((l) => l.situacao_vendedor === 'normal').length ?? 0
  const totalDiasUteis = cotaMes?.filter((d) => d.situacao === 'normal').length ?? 0
  const projecaoMes = calcularProjecao(valorMes, diasTrabalhados, totalDiasUteis)

  const atendimentosHoje = lancHoje?.atendimentos ?? 0
  const pecasHoje = lancHoje?.pecas ?? 0
  const ticketCliente = calcularTicketMedio(valorHoje, atendimentosHoje)
  const ticketPeca = calcularTicketMedio(valorHoje, pecasHoje)
  const esforco = atendimentosHoje > 0 ? pecasHoje / atendimentosHoje : 0

  const { data: tarefasHoje } = await supabase
    .from('tarefas')
    .select('*')
    .eq('data', hojeStr)
    .or(`vendedor_id.eq.${user!.id},vendedor_id.is.null`)
    .order('criado_em')

  const diaSemanaHoje = hoje.getDay()
  const { data: rotinaHojeTodos } = await supabase
    .from('rotina_modelo')
    .select('*')
    .eq('dia_semana', diaSemanaHoje)
    .order('ordem')

  // Define em qual "metade" da rotina este vendedor está (0 ou 1), com base
  // na posição dele entre os vendedores ativos, para dividir as tarefas dos blocos.
  const { data: vendedoresAtivos } = await supabase
    .from('profiles')
    .select('id')
    .eq('perfil', 'vendedor')
    .eq('ativo', true)
    .order('nome')

  const meuIndice = (vendedoresAtivos ?? []).findIndex((v) => v.id === user!.id)
  const minhaMetade = meuIndice >= 0 ? meuIndice % 2 : 0

  const rotinaHoje = (rotinaHojeTodos ?? []).filter(
    (item) => item.atribuido_a === null || item.atribuido_a === minhaMetade
  )

  const { data: rotinaConcluidaHoje } = await supabase
    .from('rotina_concluida')
    .select('item_id')
    .eq('vendedor_id', user!.id)
    .eq('data', hojeStr)

  const concluidosSet = new Set(rotinaConcluidaHoje?.map((r) => r.item_id) ?? [])

  const blocosRotina: { horario: string; bloco: string; itens: { id: string; descricao: string; concluido: boolean }[] }[] = []
  for (const item of rotinaHoje ?? []) {
    let grupo = blocosRotina.find((b) => b.horario === item.horario && b.bloco === item.bloco)
    if (!grupo) {
      grupo = { horario: item.horario, bloco: item.bloco, itens: [] }
      blocosRotina.push(grupo)
    }
    grupo.itens.push({ id: item.id, descricao: item.descricao, concluido: concluidosSet.has(item.id) })
  }

  const totalItensRotina = rotinaHoje?.length ?? 0
  const totalConcluidosRotina = concluidosSet.size

  const { data: historico30 } = await supabase
    .from('lancamentos')
    .select('*')
    .eq('vendedor_id', user!.id)
    .order('data', { ascending: false })
    .limit(30)

  const data30diasAtras = new Date(hoje)
  data30diasAtras.setDate(hoje.getDate() - 30)
  const { data: situacoes30 } = await supabase
    .from('distribuicao_diaria')
    .select('data, situacao')
    .is('vendedor_id', null)
    .gte('data', data30diasAtras.toISOString().slice(0, 10))
    .lte('data', hojeStr)

  const situacaoMap = new Map(situacoes30?.map((s) => [s.data, s.situacao]) ?? [])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Olá, {profile?.nome}</h1>

      <Card className="border-indigo-800 bg-indigo-950/40">
        <CardContent className="py-4">
          <p className="text-sm text-indigo-200 italic">💡 {fraseDoDia(hoje)}</p>
        </CardContent>
      </Card>

      {blocosRotina.length > 0 && (
        <Card className="border-slate-800 bg-slate-900">
          <CardHeader>
            <CardTitle className="text-base">
              Rotina do Dia ({totalConcluidosRotina}/{totalItensRotina})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {blocosRotina.map((grupo) => (
              <div key={`${grupo.horario}-${grupo.bloco}`}>
                <p className="text-sm font-semibold text-indigo-400 mb-1">
                  {grupo.horario} — {grupo.bloco}
                </p>
                <div className="space-y-1 pl-2">
                  {grupo.itens.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className={item.concluido ? 'line-through text-slate-500' : ''}>{item.descricao}</span>
                      <form action={alternarItemRotina.bind(null, item.id, hojeStr, !item.concluido)}>
                        <Button type="submit" size="sm" variant="outline">
                          {item.concluido ? '↺' : '✓'}
                        </Button>
                      </form>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {tarefasHoje && tarefasHoje.length > 0 && (
        <Card className="border-slate-800 bg-slate-900">
          <CardHeader><CardTitle className="text-base">Tarefas de Hoje</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {tarefasHoje.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-2 text-sm">
                <span className={t.concluida ? 'line-through text-slate-500' : ''}>{t.descricao}</span>
                <form action={alternarConclusaoTarefa.bind(null, t.id, !t.concluida)}>
                  <Button type="submit" size="sm" variant="outline">
                    {t.concluida ? 'Reabrir' : 'Concluir'}
                  </Button>
                </form>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="border-slate-800 bg-slate-900">
        <CardHeader><CardTitle className="text-base">Progresso de Hoje</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <ProgressBar label="Valor" atual={valorHoje} meta={cotaValorHoje} formatar={(v) => `R$ ${v.toFixed(2)}`} />
          <ProgressBar label="Atendimentos" atual={atendimentosHoje} meta={cotaHoje?.cota_atendimentos ?? 0} />
          <ProgressBar label="Peças" atual={pecasHoje} meta={cotaHoje?.cota_pecas ?? 0} />
          {faltaHoje > 0 ? (
            <p className="text-sm text-yellow-400">Falta R$ {faltaHoje.toFixed(2)} para bater a meta de hoje.</p>
          ) : (
            <p className="text-sm text-green-400">Você bateu a meta de hoje! 🎯</p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-800 bg-slate-900">
          <CardHeader><CardTitle className="text-sm text-slate-400">Ticket Médio / Cliente</CardTitle></CardHeader>
          <CardContent className="text-xl font-bold">R$ {ticketCliente.toFixed(2)}</CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-900">
          <CardHeader><CardTitle className="text-sm text-slate-400">Ticket Médio / Peça</CardTitle></CardHeader>
          <CardContent className="text-xl font-bold">R$ {ticketPeca.toFixed(2)}</CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-900">
          <CardHeader><CardTitle className="text-sm text-slate-400">Esforço Diário (peças/atend.)</CardTitle></CardHeader>
          <CardContent className="text-xl font-bold">{esforco.toFixed(2)}</CardContent>
        </Card>
      </div>

      <Card className="border-slate-800 bg-slate-900">
        <CardHeader><CardTitle className="text-base">Progresso da Semana</CardTitle></CardHeader>
        <CardContent>
          <ProgressBar label="Valor" atual={valorSemana} meta={cotaValorSemana} formatar={(v) => `R$ ${v.toFixed(2)}`} />
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-900">
        <CardHeader><CardTitle className="text-base">Progresso do Mês</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <ProgressBar label="Valor" atual={valorMes} meta={cotaValorMes} formatar={(v) => `R$ ${v.toFixed(2)}`} />
          <p className="text-sm text-slate-400">
            Projeção: R$ {projecaoMes.toFixed(2)} ({cotaValorMes > 0 ? ((projecaoMes / cotaValorMes) * 100).toFixed(1) : '0'}% da meta)
          </p>
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-900">
        <CardHeader><CardTitle className="text-base">Histórico Pessoal (últimos 30 dias)</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Atend.</TableHead>
                <TableHead>Peças</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historico30?.map((l) => {
                const situacaoDia = situacaoMap.get(l.data)
                const status =
                  situacaoDia === 'feriado' ? 'Feriado' : situacaoDia === 'fechado' ? 'Fechado' : '—'
                return (
                  <TableRow key={l.id}>
                    <TableCell>{l.data.split('-').reverse().join('/')}</TableCell>
                    <TableCell>{l.atendimentos}</TableCell>
                    <TableCell>{l.pecas}</TableCell>
                    <TableCell>R$ {Number(l.valor).toFixed(2)}</TableCell>
                    <TableCell>{status}</TableCell>
                  </TableRow>
                )
              })}
              {Array.from(situacaoMap.entries())
                .filter(([dia, sit]) => (sit === 'feriado' || sit === 'fechado') && !historico30?.some((l) => l.data === dia))
                .sort(([a], [b]) => (a < b ? 1 : -1))
                .map(([dia, sit]) => (
                  <TableRow key={dia}>
                    <TableCell>{dia.split('-').reverse().join('/')}</TableCell>
                    <TableCell>—</TableCell>
                    <TableCell>—</TableCell>
                    <TableCell>—</TableCell>
                    <TableCell>{sit === 'feriado' ? 'Feriado' : 'Fechado'}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
