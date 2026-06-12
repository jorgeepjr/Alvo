import { createClient } from '@/lib/supabase/server'
import { calcularProjecao, calcularTicketMedio } from '@/lib/calculos'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProgressBar } from '@/components/progress-bar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { alternarConclusaoTarefa, alternarItemRotina } from '@/app/gestor/tarefas/actions'
import { fraseDoDia } from '@/lib/frases-motivacionais'
import { LancamentoForm } from '@/app/painel/lancamento/lancamento-form'
import { MeuMesChart } from '@/components/meu-mes-chart'

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

  // Streak: dias consecutivos batendo a meta (últimos 60 dias)
  const data60diasAtras = new Date(hoje)
  data60diasAtras.setDate(hoje.getDate() - 60)
  const inicio60 = data60diasAtras.toISOString().slice(0, 10)
  const { data: cotas60 } = await supabase
    .from('distribuicao_diaria')
    .select('data, cota_valor, situacao')
    .eq('vendedor_id', user!.id)
    .gte('data', inicio60)
    .lte('data', hojeStr)
  const { data: lanc60 } = await supabase
    .from('lancamentos')
    .select('data, valor')
    .eq('vendedor_id', user!.id)
    .gte('data', inicio60)
    .lte('data', hojeStr)

  const lancMap60 = new Map(lanc60?.map((l) => [l.data, Number(l.valor)]) ?? [])
  const cotasOrdenadas = (cotas60 ?? [])
    .filter((c) => c.situacao === 'normal' && Number(c.cota_valor) > 0)
    .sort((a, b) => (a.data < b.data ? 1 : -1))

  let streak = 0
  for (const c of cotasOrdenadas) {
    const vendido = lancMap60.get(c.data) ?? 0
    const bateu = vendido >= Number(c.cota_valor)
    if (c.data === hojeStr && !bateu) continue // hoje ainda em andamento não quebra a sequência
    if (bateu) streak++
    else break
  }

  // Gráfico do mês: acumulado real vs cota acumulada vs projeção do ritmo atual
  const vendaDiaMap = new Map<string, number>()
  for (const l of lancMes ?? []) {
    vendaDiaMap.set(l.data, (vendaDiaMap.get(l.data) ?? 0) + Number(l.valor))
  }
  const cotaDiaMap = new Map<string, number>()
  for (const c of cotaMes ?? []) {
    cotaDiaMap.set(c.data, (cotaDiaMap.get(c.data) ?? 0) + Number(c.cota_valor))
  }

  const diaHoje = hoje.getDate()
  const ritmoDiario = diasTrabalhados > 0 ? valorMes / diasTrabalhados : 0
  let acumReal = 0
  let acumCota = 0
  let diasUteisAcum = 0
  const dadosMeuMes = Array.from({ length: ultimoDia }, (_, i) => {
    const dia = i + 1
    const dataStr = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    acumReal += vendaDiaMap.get(dataStr) ?? 0
    acumCota += cotaDiaMap.get(dataStr) ?? 0
    const ehDiaUtil = (cotaDiaMap.get(dataStr) ?? 0) > 0
    if (ehDiaUtil) diasUteisAcum++
    return {
      dia,
      atual: dia <= diaHoje ? Math.round(acumReal * 100) / 100 : null,
      meta: Math.round(acumCota * 100) / 100,
      projecao: dia >= diaHoje ? Math.round(diasUteisAcum * ritmoDiario * 100) / 100 : null,
    }
  })

  const vaiBaterMeta = projecaoMes >= cotaValorMes && cotaValorMes > 0

  const metaHojeBatida = cotaValorHoje > 0 && faltaHoje <= 0
  const situacaoHoje = situacaoMap.get(hojeStr)
  const diaBloqueadoHoje = situacaoHoje === 'feriado' || situacaoHoje === 'fechado'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Olá, {profile?.nome} 👋</h1>
          <p className="text-sm text-slate-400 capitalize">
            {hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {streak > 1 && (
            <span className="rounded-full px-3 py-1 text-xs font-semibold bg-orange-600/20 text-orange-300 border border-orange-700">
              🔥 {streak} dias batendo meta
            </span>
          )}
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              metaHojeBatida
                ? 'bg-green-600/20 text-green-400 border border-green-700'
                : 'bg-yellow-600/20 text-yellow-300 border border-yellow-700'
            }`}
          >
            {cotaValorHoje <= 0
              ? 'Sem cota definida hoje'
              : metaHojeBatida
              ? '🎯 Meta do dia batida!'
              : `Falta R$ ${faltaHoje.toFixed(2)} hoje`}
          </span>
        </div>
      </div>

      {metaHojeBatida && (
        <Card className="border-green-700 bg-gradient-to-r from-green-950/60 to-emerald-900/30">
          <CardContent className="py-4 flex items-center gap-3">
            <span className="text-3xl animate-bounce">🏆</span>
            <div>
              <p className="font-bold text-green-300">Parabéns! Você bateu a meta de hoje!</p>
              <p className="text-sm text-green-400/80">
                {streak > 1 ? `Sequência de ${streak} dias — continue assim!` : 'Que tal começar uma sequência? Amanhã tem mais!'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-indigo-800 bg-gradient-to-r from-indigo-950/60 to-slate-900">
        <CardContent className="py-4">
          <p className="text-sm text-indigo-200 italic">💡 {fraseDoDia(hoje)}</p>
        </CardContent>
      </Card>

      {blocosRotina.length > 0 && (
        <Card className="border-slate-800 bg-slate-900">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">Rotina do Dia</CardTitle>
              <span className="text-xs text-slate-400">
                {totalConcluidosRotina}/{totalItensRotina} concluídos
              </span>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  totalConcluidosRotina >= totalItensRotina ? 'bg-green-500' : 'bg-indigo-500'
                }`}
                style={{ width: `${totalItensRotina > 0 ? (totalConcluidosRotina / totalItensRotina) * 100 : 0}%` }}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {blocosRotina.map((grupo) => {
              const blocoCompleto = grupo.itens.every((i) => i.concluido)
              return (
                <div
                  key={`${grupo.horario}-${grupo.bloco}`}
                  className={`rounded-lg border p-3 ${
                    blocoCompleto ? 'border-green-900/60 bg-green-950/20' : 'border-slate-800 bg-slate-950/40'
                  }`}
                >
                  <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <span className="rounded bg-indigo-600/20 text-indigo-300 px-2 py-0.5 text-xs">{grupo.horario}</span>
                    <span className={blocoCompleto ? 'text-green-400' : 'text-slate-200'}>
                      {grupo.bloco} {blocoCompleto && '✓'}
                    </span>
                  </p>
                  <div className="space-y-1">
                    {grupo.itens.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-2 text-sm">
                        <span className={item.concluido ? 'line-through text-slate-500' : 'text-slate-300'}>
                          {item.descricao}
                        </span>
                        <form action={alternarItemRotina.bind(null, item.id, hojeStr, !item.concluido)}>
                          <Button type="submit" size="sm" variant={item.concluido ? 'ghost' : 'outline'}>
                            {item.concluido ? '↺' : '✓'}
                          </Button>
                        </form>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
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
        <CardHeader>
          <CardTitle className="text-base">⚡ Lançamento Rápido — Hoje</CardTitle>
        </CardHeader>
        <CardContent>
          {diaBloqueadoHoje ? (
            <p className="text-sm text-slate-400">
              {situacaoHoje === 'feriado' ? 'Hoje é feriado.' : 'A loja está fechada hoje.'} Não é necessário lançar vendas.
            </p>
          ) : (
            <LancamentoForm data={hojeStr} existente={lancHoje} />
          )}
        </CardContent>
      </Card>

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
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Meu Mês — Dia a Dia</CardTitle>
            {cotaValorMes > 0 && (
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  vaiBaterMeta
                    ? 'bg-green-600/20 text-green-400 border border-green-700'
                    : 'bg-red-600/20 text-red-400 border border-red-700'
                }`}
              >
                {vaiBaterMeta
                  ? `✅ No ritmo atual você bate a meta (${((projecaoMes / cotaValorMes) * 100).toFixed(0)}%)`
                  : `⚠️ No ritmo atual você chega a ${((projecaoMes / cotaValorMes) * 100).toFixed(0)}% da meta`}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <MeuMesChart dados={dadosMeuMes} />
          {cotaValorMes > 0 && !vaiBaterMeta && (
            <p className="mt-2 text-sm text-yellow-400">
              💪 Pergunte ao Assistente IA uma estratégia para acelerar: ele conhece seus números e pode sugerir ações práticas.
            </p>
          )}
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
        <CardContent className="overflow-x-auto">
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
                return (
                  <TableRow key={l.id}>
                    <TableCell>{l.data.split('-').reverse().join('/')}</TableCell>
                    <TableCell>{l.atendimentos}</TableCell>
                    <TableCell>{l.pecas}</TableCell>
                    <TableCell>R$ {Number(l.valor).toFixed(2)}</TableCell>
                    <TableCell>
                      {situacaoDia === 'feriado' ? (
                        <span className="rounded bg-blue-600/20 text-blue-300 px-2 py-0.5 text-xs">Feriado</span>
                      ) : situacaoDia === 'fechado' ? (
                        <span className="rounded bg-slate-600/30 text-slate-300 px-2 py-0.5 text-xs">Fechado</span>
                      ) : (
                        '—'
                      )}
                    </TableCell>
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
                    <TableCell>
                      {sit === 'feriado' ? (
                        <span className="rounded bg-blue-600/20 text-blue-300 px-2 py-0.5 text-xs">Feriado</span>
                      ) : (
                        <span className="rounded bg-slate-600/30 text-slate-300 px-2 py-0.5 text-xs">Fechado</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
