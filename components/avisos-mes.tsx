import { Aviso, P, R0 } from '@/components/bloco-mes'
import { addMes, ddmm, MESES_NOME, mesDe, ymDe } from '@/lib/datas'
import { avaliacaoDoDia, diasPendentes, type InfoMes } from '@/lib/projecao'
import type { DadosMes } from '@/lib/dados-mes'

const PLANO_MEIO = [
  'Campanha da 2ª quinzena: escolher o tema e avisar os clientes',
  'Reativação dos inativos: aumentar o ritmo de envios',
  'Lista VIP: novidades e peças separadas pra quem compra mais',
]
const PLANO_FINAL = [
  'Live no dia 25: avisar a agência 4 a 5 dias antes pra montar o anúncio',
  'Cobrar as condicionais vencidas e chamar quem respondeu à reativação',
  'Lista VIP: convite com prazo ("só até sábado")',
]

/**
 * Avisos do topo do Início / Meu dia:
 * - avaliação do mês (meio do mês e reta final, dias em Ajustes);
 * - fechamento do mês anterior (dia 1 a 10, só gestor);
 * - dia útil passado sem lançamento (o dia fecha às 18h: o aviso aparece no dia seguinte).
 */
export function AvisosMes({
  hoje,
  atual,
  anterior,
  cfg,
  vendedorId,
  gestor,
  ymSelecionado,
  superMeta,
}: {
  hoje: string
  atual: DadosMes
  anterior?: DadosMes | null
  cfg: { avalMeio: number; avalFinalIni: number; avalFinalFim: number }
  vendedorId?: string
  gestor: boolean
  ymSelecionado: string
  superMeta?: number
}) {
  const dia = Number(hoje.slice(8, 10))
  const ymHoje = ymDe(hoje)
  const I: InfoMes = vendedorId ? atual.porVendedor[vendedorId] : atual.loja
  const out: React.ReactNode[] = []

  const av = avaliacaoDoDia(dia, { meio: cfg.avalMeio, finalIni: cfg.avalFinalIni, finalFim: cfg.avalFinalFim })
  if (av && I && I.meta && I.diasLancados) {
    const ok = I.provavel >= I.meta
    const ns = MESES_NOME[mesDe(ymHoje) - 1]
    const plano = av === 1 ? PLANO_MEIO : PLANO_FINAL
    const sup = !vendedorId && superMeta ? superMeta : 0
    out.push(
      <Aviso
        key="av"
        id="avMes"
        tom={ok ? 'ok' : 'bad'}
        icone={av === 1 ? '🧭' : '🏁'}
        titulo={`${av === 1 ? 'Avaliação do meio do mês' : 'Avaliação da reta final'}: ${
          ok ? (av === 1 ? 'no ritmo, mantém o plano' : `no ritmo de bater${sup ? ', dá pra buscar a super meta' : ''}`) : av === 1 ? 'precisa esquentar a 2ª quinzena' : 'precisa forçar agora'
        }`}
      >
        <p>
          {ns} até {I.ultimoLancado ? ddmm(I.ultimoLancado) : '—'}: {R0(I.vendido)} ({P(I.pct)} da meta). Provável: <b>{R0(I.provavel)}</b> ({P(I.provavel / I.meta)}).{' '}
          {!ok && (
            <>
              Faltam {R0(I.falta)}: <b>{R0(I.porDia)} por dia</b> nos {I.diasRestantes} dias úteis, contra a média de {R0(I.media)}.
            </>
          )}
          {ok && sup > 0 && ` Pra super meta faltam ${R0(Math.max(0, sup - I.vendido))}.`}
        </p>
        {gestor && (!ok || sup > 0) && (
          <div className="mt-2">
            <b className="text-xs">{ok ? 'Pra buscar mais' : 'Plano sugerido'}:</b>
            {plano.map((x) => (
              <div key={x} className="mt-1 text-xs">☐ {x}</div>
            ))}
          </div>
        )}
      </Aviso>,
    )
  }

  if (gestor && dia <= 10) {
    const ant = addMes(ymHoje, -1)
    if (ymSelecionado !== ant)
      out.push(
        <Aviso key="fech" tom="neu" icone="📋" titulo={`Fechamento de ${MESES_NOME[mesDe(ant) - 1]}`} acao={{ href: `/gestor/comissoes?mes=${ant}`, texto: 'Ver fechamento →' }}>
          O mês virou. Confira as vendas e a comissão de cada vendedor pra pagar.
        </Aviso>,
      )
  }

  // Dia útil passado sem lançamento: mês atual, e o anterior até o dia 5.
  const fontes = [atual, ...(anterior && dia <= 5 ? [anterior] : [])]
  const vend = atual.vendedores.filter((v) => !vendedorId || v.id === vendedorId)
  const pend = fontes.flatMap((d) => {
    const lanc = new Set(d.lancamentos.filter((l) => l.vendedor_id).map((l) => `${l.vendedor_id}|${l.data}`))
    // O vendedor não enxerga a linha da loja: usa os dias dele (mesma situação).
    const base = vendedorId && d.diasVend[vendedorId]?.some((x) => x.cota > 0) ? d.diasVend[vendedorId] : d.diasLoja
    const uteis = base.filter((x) => x.situacao === 'normal').map((x) => x.data)
    return diasPendentes(uteis, hoje, vend, lanc)
  })
  if (pend.length) {
    const g = new Map<string, string[]>()
    for (const p of pend) g.set(p.nome, [...(g.get(p.nome) ?? []), ddmm(p.data)])
    const nomes = [...g.keys()]
    out.push(
      <Aviso
        key="pend"
        tom="bad"
        icone="⏰"
        titulo={`${nomes.join(' e ')} ${nomes.length > 1 ? 'têm' : 'tem'} dia sem lançamento`}
        acao={gestor ? { href: `/gestor/lancamento?data=${pend[0].data}&vendedor=${pend[0].vendedorId}`, texto: 'Lançar →' } : undefined}
      >
        {[...g.entries()].map(([n, ds]) => `${n}: ${ds.join(', ')}`).join(' · ')}. O dia fecha às 18h: o aviso aparece no dia seguinte.
        {!gestor && ' Avise o gestor.'}
      </Aviso>,
    )
  }

  if (!out.length) return null
  return <div className="space-y-2.5">{out}</div>
}
