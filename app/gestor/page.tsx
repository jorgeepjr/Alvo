import { createClient } from '@/lib/supabase/server'
import { calcularProjecao, calcularTicketMedio, formatBRL } from '@/lib/calculos'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProgressBar } from '@/components/progress-bar'
import { RankingList } from '@/components/ranking-list'
import { MesAtualChart } from '@/components/mes-atual-chart'
import { DiaOscilacaoChart } from '@/components/dia-oscilacao-chart'
import { ProjecaoIA } from './projecao-ia'
import { ResumoDia } from './resumo-dia'

export default async function GestorDashboard() {
  const supabase = await createClient()
  const hoje = new Date()
  const hojeStr = hoje.toISOString().slice(0, 10)
  const ano = hoje.getFullYear()
  const mes = hoje.getMonth() + 1
  const inicioMes = `${ano}-${String(mes).padStart(2, '0')}-01`
  const ultimoDia = new Date(ano, mes, 0).getDate()
  const fimMes = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`

  const { data: vendedores } = await supabase.from('profiles').select('*').eq('perfil', 'vendedor').eq('ativo', true)
  const { data: lancamentosHoje } = await supabase.from('lancamentos').select('*').eq('data', hojeStr)
  const { data: distribuicaoHoje } = await supabase.from('distribuicao_diaria').select('*').eq('data', hojeStr).is('vendedor_id', null).maybeSingle()
  const { data: lancamentosMes } = await supabase.from('lancamentos').select('*').gte('data', inicioMes).lte('data', fimMes)
  const { data: distribuicaoMes } = await supabase.from('distribuicao_diaria').select('*').is('vendedor_id', null).gte('data', inicioMes).lte('data', fimMes)
  const { data: meta } = await supabase.from('metas_mensais').select('*').eq('ano', ano).eq('mes', mes).maybeSingle()
  const { data: campanhasMes } = await supabase.from('campanhas').select('titulo, status').eq('mes', mes).order('ordem')

  const valorHoje = lancamentosHoje?.reduce((acc, l) => acc + Number(l.valor), 0) ?? 0
  const atendimentosHoje = lancamentosHoje?.reduce((acc, l) => acc + l.atendimentos, 0) ?? 0
  const pecasHoje = lancamentosHoje?.reduce((acc, l) => acc + l.pecas, 0) ?? 0
  const vendaLojaHoje = lancamentosHoje?.find((l) => l.vendedor_id === null)

  const valorMes = lancamentosMes?.reduce((acc, l) => acc + Number(l.valor), 0) ?? 0
  const cotaMes = Number(meta?.meta_valor ?? 0)
  const diasTrabalhados = new Set(lancamentosMes?.map((l) => l.data)).size
  const totalDiasUteis = distribuicaoMes?.filter((d) => d.situacao === 'normal').length ?? 0
  const projecao = calcularProjecao(valorMes, diasTrabalhados, totalDiasUteis)
  const diasRestantes = distribuicaoMes?.filter((d) => d.situacao === 'normal' && d.data >= hojeStr).length ?? 0

  const ranking = await Promise.all(
    (vendedores ?? []).map(async (v) => {
      const lancV = lancamentosMes?.filter((l) => l.vendedor_id === v.id) ?? []
      const { data: distV } = await supabase
        .from('distribuicao_diaria')
        .select('cota_valor')
        .eq('vendedor_id', v.id)
        .gte('data', inicioMes)
        .lte('data', fimMes)

      const valor = lancV.reduce((acc, l) => acc + Number(l.valor), 0)
      const cota = distV?.reduce((acc, d) => acc + Number(d.cota_valor), 0) ?? 0
      const atendimentos = lancV.reduce((acc, l) => acc + l.atendimentos, 0)
      const pecas = lancV.reduce((acc, l) => acc + l.pecas, 0)
      const percentual = cota > 0 ? (valor / cota) * 100 : 0

      const { data: ultimos30 } = await supabase
        .from('lancamentos')
        .select('valor, atendimentos')
        .eq('vendedor_id', v.id)
        .order('data', { ascending: false })
        .limit(30)

      const valorTotal30 = ultimos30?.reduce((acc, l) => acc + Number(l.valor), 0) ?? 0
      const atendTotal30 = ultimos30?.reduce((acc, l) => acc + l.atendimentos, 0) ?? 0
      const ticketMedioHistorico = calcularTicketMedio(valorTotal30, atendTotal30)
      const ticketMedioAtual = calcularTicketMedio(valor, atendimentos)
      const alertaTicket = ticketMedioHistorico > 0 && ticketMedioAtual < ticketMedioHistorico * 0.8

      return { id: v.id, nome: v.nome, valor, percentual, atendimentos, pecas, alertaTicket }
    })
  )

  // Ritmo esperado até hoje = % de dias úteis já decorridos no mês.
  const diasUteisTotais = distribuicaoMes?.filter((d) => d.situacao === 'normal').length ?? 0
  const diasUteisDecorridos = distribuicaoMes?.filter((d) => d.situacao === 'normal' && d.data <= hojeStr).length ?? 0
  const ritmoEsperado = diasUteisTotais > 0 ? (diasUteisDecorridos / diasUteisTotais) * 100 : 0

  const alertasMeta = ranking.filter((r) => ritmoEsperado > 0 && r.percentual < ritmoEsperado * 0.8)

  // Gráfico diário do mês: acumulado real vs ritmo do mesmo mês do ano passado vs ritmo da meta
  const { data: histAnoPassado } = await supabase
    .from('historico_loja')
    .select('venda_total')
    .eq('ano', ano - 1)
    .eq('mes', mes)
    .maybeSingle()

  const totalAnoPassado = Number(histAnoPassado?.venda_total ?? 0)

  // Vendas diárias REAIS do mesmo mês no ano passado (histórico importado das
  // planilhas), para a linha de comparação ser dia a dia de verdade.
  const mmStr = String(mes).padStart(2, '0')
  const { data: diarioAnoPassado } = await supabase
    .from('historico_diario')
    .select('data, venda_total')
    .gte('data', `${ano - 1}-${mmStr}-01`)
    .lte('data', `${ano - 1}-${mmStr}-31`)
  const vendaLYPorDia = new Map((diarioAnoPassado ?? []).map((d) => [d.data, Number(d.venda_total)]))
  const temDiarioLY = (diarioAnoPassado?.length ?? 0) > 0

  const vendaPorDia = new Map<string, number>()
  for (const l of lancamentosMes ?? []) {
    vendaPorDia.set(l.data, (vendaPorDia.get(l.data) ?? 0) + Number(l.valor))
  }

  const diaHoje = hoje.getDate()

  // Projeção: a partir de hoje, segue no ritmo médio diário das vendas (valor já
  // vendido / dias trabalhados), somando esse ritmo a cada dia útil restante.
  const diasUteisSet = new Set((distribuicaoMes ?? []).filter((d) => d.situacao === 'normal').map((d) => d.data))
  const ritmoDiario = diasTrabalhados > 0 ? valorMes / diasTrabalhados : 0

  let acumulado = 0
  let projAcum = 0
  let acumLY = 0
  const dadosGrafico = Array.from({ length: ultimoDia }, (_, i) => {
    const dia = i + 1
    const dd = String(dia).padStart(2, '0')
    const dataStr = `${ano}-${mmStr}-${dd}`
    acumulado += vendaPorDia.get(dataStr) ?? 0
    acumLY += vendaLYPorDia.get(`${ano - 1}-${mmStr}-${dd}`) ?? 0

    let projecao: number | null = null
    if (dia === diaHoje) {
      projAcum = acumulado // ancora a projeção no valor real de hoje
      projecao = Math.round(projAcum * 100) / 100
    } else if (dia > diaHoje) {
      if (diasUteisSet.has(dataStr)) projAcum += ritmoDiario
      projecao = Math.round(projAcum * 100) / 100
    }

    return {
      dia,
      atual: dia <= diaHoje ? Math.round(acumulado * 100) / 100 : null,
      // Linha do ano passado: usa o acumulado diário real (se houver histórico),
      // senão cai no ritmo médio mensal.
      anoPassado: temDiarioLY
        ? Math.round(acumLY * 100) / 100
        : totalAnoPassado > 0
        ? Math.round((totalAnoPassado / ultimoDia) * dia * 100) / 100
        : null,
      meta: cotaMes > 0 ? Math.round((cotaMes / ultimoDia) * dia * 100) / 100 : null,
      projecao,
    }
  })

  // Oscilação diária: quanto foi vendido em cada dia (barra) vs a cota do dia (linha).
  const cotaDiaMap = new Map<string, number>()
  for (const d of distribuicaoMes ?? []) cotaDiaMap.set(d.data, Number(d.cota_valor))
  const dadosOscilacao = Array.from({ length: ultimoDia }, (_, i) => {
    const dia = i + 1
    const dataStr = `${ano}-${mmStr}-${String(dia).padStart(2, '0')}`
    const cota = cotaDiaMap.get(dataStr) ?? 0
    return {
      dia,
      vendido: dia <= diaHoje ? Math.round((vendaPorDia.get(dataStr) ?? 0) * 100) / 100 : null,
      cota: cota > 0 ? cota : null,
    }
  })

  const acumuladoHoje = dadosGrafico[diaHoje - 1]?.atual ?? 0
  // Comparação até hoje: usa o acumulado diário real do ano passado quando há
  // histórico; senão, o ritmo médio mensal.
  const anoPassadoAteHoje = temDiarioLY
    ? (dadosGrafico[diaHoje - 1]?.anoPassado ?? 0)
    : totalAnoPassado > 0
    ? (totalAnoPassado / ultimoDia) * diaHoje
    : 0
  const vsAnoPassado = anoPassadoAteHoje > 0 ? ((Number(acumuladoHoje) - anoPassadoAteHoje) / anoPassadoAteHoje) * 100 : null

  // Texto do "Resumo do Dia" para copiar e colar no WhatsApp (grátis, sem API).
  const ddmm = `${String(diaHoje).padStart(2, '0')}/${String(mes).padStart(2, '0')}`
  const cotaHojeLoja = Number(distribuicaoHoje?.cota_valor ?? 0)
  const ticketHoje = atendimentosHoje > 0 ? valorHoje / atendimentosHoje : 0
  const linhasVend = (vendedores ?? [])
    .map((v) => {
      const lv = lancamentosHoje?.find((l) => l.vendedor_id === v.id)
      return `• ${v.nome}: R$ ${formatBRL(Number(lv?.valor ?? 0))} (${lv?.pecas ?? 0} peças)`
    })
    .join('\n')
  const resumoTexto =
    `📊 Resumo do dia ${ddmm} — ZYNK\n` +
    `💰 Vendido hoje: R$ ${formatBRL(valorHoje)}${cotaHojeLoja > 0 ? ` (cota R$ ${formatBRL(cotaHojeLoja)}) ${valorHoje >= cotaHojeLoja ? '✅' : '⚠️'}` : ''}\n` +
    `👥 Atendimentos: ${atendimentosHoje} | 👕 Peças: ${pecasHoje} | 🎟️ Ticket: R$ ${formatBRL(ticketHoje)}\n` +
    (linhasVend ? `\nPor vendedor:\n${linhasVend}\n` : '') +
    `\n📅 Mês: R$ ${formatBRL(valorMes)}${cotaMes > 0 ? ` de R$ ${formatBRL(cotaMes)} (${((valorMes / cotaMes) * 100).toFixed(0)}%)` : ''}` +
    `${cotaMes > 0 ? ` | Projeção: R$ ${formatBRL(projecao)} (${((projecao / cotaMes) * 100).toFixed(0)}%)` : ''}`

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard da Loja</h1>

      {((cotaMes > 0 && projecao < cotaMes * 0.9) || alertasMeta.length > 0) && (
        <Card className="border-red-700 bg-red-950/40">
          <CardContent className="py-3 space-y-1">
            {cotaMes > 0 && projecao < cotaMes * 0.9 && (
              <p className="text-sm text-red-300 font-medium">
                🚨 No ritmo atual o mês deve fechar em {((projecao / cotaMes) * 100).toFixed(0)}% da meta
                (faltam R$ {formatBRL((cotaMes - projecao))}). Hora de uma ação de vendas para crescer.
              </p>
            )}
            {alertasMeta.map((r) => (
              <p key={`top-${r.id}`} className="text-sm text-red-300">
                ⚠️ {r.nome} está em {r.percentual.toFixed(0)}% da meta, abaixo do ritmo esperado ({ritmoEsperado.toFixed(0)}%).
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border-slate-800 bg-slate-900">
          <CardHeader><CardTitle className="text-sm text-slate-400">Vendido Hoje</CardTitle></CardHeader>
          <CardContent>
            <p className="text-xl font-bold">R$ {formatBRL(valorHoje)}</p>
            {distribuicaoHoje && <p className="text-xs text-slate-400">Cota: R$ {formatBRL(Number(distribuicaoHoje.cota_valor))}</p>}
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-900">
          <CardHeader><CardTitle className="text-sm text-slate-400">Atendimentos Hoje</CardTitle></CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{atendimentosHoje}</p>
            {distribuicaoHoje && <p className="text-xs text-slate-400">Meta: {distribuicaoHoje.cota_atendimentos}</p>}
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-900">
          <CardHeader><CardTitle className="text-sm text-slate-400">Peças Hoje</CardTitle></CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{pecasHoje}</p>
            {distribuicaoHoje && <p className="text-xs text-slate-400">Meta: {distribuicaoHoje.cota_pecas}</p>}
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-900">
          <CardHeader><CardTitle className="text-sm text-slate-400">Venda da Loja Hoje</CardTitle></CardHeader>
          <CardContent>
            <p className="text-xl font-bold">R$ {formatBRL(Number(vendaLojaHoje?.valor ?? 0))}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Mês Atual — Dia a Dia vs {ano - 1}</CardTitle>
            {vsAnoPassado !== null && (
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  vsAnoPassado >= 0
                    ? 'bg-green-600/20 text-green-400 border border-green-700'
                    : 'bg-red-600/20 text-red-400 border border-red-700'
                }`}
              >
                {vsAnoPassado >= 0 ? '▲' : '▼'} {Math.abs(vsAnoPassado).toFixed(1)}% vs ritmo de {ano - 1}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <MesAtualChart dados={dadosGrafico} anoAtual={ano} anoPassado={ano - 1} />
          {cotaMes > 0 && (
            <p className={`mt-2 text-sm ${projecao >= cotaMes ? 'text-green-400' : 'text-yellow-400'}`}>
              {projecao >= cotaMes
                ? `✅ No ritmo atual, a projeção é fechar o mês em R$ ${formatBRL(projecao)} — acima da meta (${((projecao / cotaMes) * 100).toFixed(0)}%).`
                : `⚠️ No ritmo atual, a projeção é fechar o mês em R$ ${formatBRL(projecao)} (${((projecao / cotaMes) * 100).toFixed(0)}% da meta). Faltam R$ ${formatBRL((cotaMes - projecao))} — vale uma ação de vendas para crescer.`}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle className="text-base">Vendas por Dia — oscilação do mês</CardTitle>
          <p className="text-xs text-slate-400 mt-1">
            Cada barra é o vendido no dia (verde = bateu a cota, vermelho = abaixo). A linha azul é a cota do dia.
          </p>
        </CardHeader>
        <CardContent>
          <DiaOscilacaoChart dados={dadosOscilacao} />
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-900">
        <CardHeader><CardTitle className="text-base">Progresso do Mês</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <ProgressBar label="Valor Mensal" atual={valorMes} meta={cotaMes} formatar={(v) => `R$ ${formatBRL(v)}`} />
          <p className="text-sm text-slate-400">
            Projeção: R$ {formatBRL(projecao)} ({cotaMes > 0 ? ((projecao / cotaMes) * 100).toFixed(1) : '0'}% da meta)
          </p>
          <p className="text-sm text-slate-400">Dias úteis restantes: {diasRestantes}</p>
        </CardContent>
      </Card>

      {campanhasMes && campanhasMes.length > 0 && (
        <Card className="border-slate-800 bg-slate-900">
          <CardHeader><CardTitle className="text-base">📣 Campanhas deste mês</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {campanhasMes.map((c, i) => (
              <span
                key={i}
                className={`rounded-full px-3 py-1 text-xs ${
                  c.status === 'feita'
                    ? 'bg-green-600/20 text-green-300'
                    : c.status === 'planejada'
                    ? 'bg-yellow-600/20 text-yellow-300'
                    : 'bg-slate-700 text-slate-200'
                }`}
              >
                {c.titulo}
              </span>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="border-zinc-700 bg-slate-900">
        <CardHeader>
          <CardTitle className="text-base">Resumo do Dia (copiar para o WhatsApp)</CardTitle>
        </CardHeader>
        <CardContent><ResumoDia texto={resumoTexto} /></CardContent>
      </Card>

      <Card className="border-zinc-700 bg-slate-900">
        <CardHeader><CardTitle className="text-base">Projeção do Mês com IA</CardTitle></CardHeader>
        <CardContent><ProjecaoIA /></CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-900">
        <CardHeader><CardTitle className="text-base">Ranking de Vendedores (% da meta)</CardTitle></CardHeader>
        <CardContent>
          <RankingList items={ranking} />
        </CardContent>
      </Card>

      {(alertasMeta.length > 0 || ranking.some((r) => r.alertaTicket)) && (
        <Card className="border-red-900 bg-red-950/30">
          <CardHeader><CardTitle className="text-base text-red-400">Alertas</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {alertasMeta.map((r) => (
              <p key={r.id}>
                ⚠️ {r.nome} está em {r.percentual.toFixed(0)}% da meta, abaixo do ritmo esperado para o dia ({ritmoEsperado.toFixed(0)}%).
              </p>
            ))}
            {ranking.filter((r) => r.alertaTicket).map((r) => (
              <p key={`ticket-${r.id}`}>⚠️ Ticket médio de {r.nome} caiu mais de 20% em relação à média histórica.</p>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
