import type { SupabaseClient } from '@supabase/supabase-js'
import { addMes, datasDoMes, fimDoMes, inicioDoMes, anoDe, mesDe } from '@/lib/datas'
import { acumular, infoMes, type InfoMes } from '@/lib/projecao'

export interface LancRow {
  id: string
  vendedor_id: string | null
  data: string
  atendimentos: number
  pecas: number
  valor: number
  valor_whatsapp?: number | null
}

export interface Vendedor { id: string; nome: string }

export interface DadosMes {
  ym: string
  meta: number
  superMeta: number
  superPremio: string
  vendedores: Vendedor[]
  lancamentos: LancRow[]
  /** cota da loja por dia */
  diasLoja: { data: string; situacao: string; cota: number }[]
  /** cota de cada vendedor por dia */
  diasVend: Record<string, { data: string; situacao: string; cota: number }[]>
  curvaAnoPassado: number[]
  loja: InfoMes
  porVendedor: Record<string, InfoMes>
}

/** Venda por dia do mesmo mês do ano passado: historico_diario, ou a soma dos lançamentos se não houver. */
export async function vendaDiariaDoMes(supabase: SupabaseClient, ym: string): Promise<Record<string, number>> {
  const ini = inicioDoMes(ym)
  const fim = fimDoMes(ym)
  const out: Record<string, number> = {}
  const { data: hd } = await supabase.from('historico_diario').select('data, venda_total').gte('data', ini).lte('data', fim)
  for (const d of hd ?? []) out[d.data] = Number(d.venda_total)
  if (Object.keys(out).length) return out
  const { data: lc } = await supabase.from('lancamentos').select('data, valor').gte('data', ini).lte('data', fim)
  for (const l of lc ?? []) out[l.data] = (out[l.data] ?? 0) + Number(l.valor)
  return out
}

export async function carregarMes(supabase: SupabaseClient, ym: string, hoje: string): Promise<DadosMes> {
  const ini = inicioDoMes(ym)
  const fim = fimDoMes(ym)
  const [vend, lanc, dist, meta, pct] = await Promise.all([
    supabase.from('profiles').select('id, nome').eq('perfil', 'vendedor').eq('ativo', true).order('nome'),
    supabase.from('lancamentos').select('*').gte('data', ini).lte('data', fim),
    supabase.from('distribuicao_diaria').select('vendedor_id, data, cota_valor, situacao').gte('data', ini).lte('data', fim),
    supabase.from('metas_mensais').select('*').eq('ano', anoDe(ym)).eq('mes', mesDe(ym)).maybeSingle(),
    supabase.from('metas_vendedor_percentual').select('vendedor_id, percentual').eq('ano', anoDe(ym)).eq('mes', mesDe(ym)),
  ])
  const vendedores = (vend.data ?? []) as Vendedor[]
  const lancamentos = ((lanc.data ?? []) as LancRow[]).map((l) => ({ ...l, valor: Number(l.valor), valor_whatsapp: Number(l.valor_whatsapp ?? 0) }))
  const metaValor = Number(meta.data?.meta_valor ?? 0)

  const linha = (vid: string | null) => {
    const m = new Map((dist.data ?? []).filter((d) => d.vendedor_id === vid).map((d) => [d.data, d]))
    return datasDoMes(ym).map((data) => {
      const d = m.get(data)
      return { data, situacao: d?.situacao ?? (new Date(`${data}T12:00:00Z`).getUTCDay() === 0 ? 'fechado' : 'normal'), cota: Number(d?.cota_valor ?? 0) }
    })
  }
  const diasLoja = linha(null)
  const diasVend: DadosMes['diasVend'] = {}
  for (const v of vendedores) diasVend[v.id] = linha(v.id)

  const lyDia = await vendaDiariaDoMes(supabase, addMes(ym, -12))
  const curvaAnoPassado = Object.keys(lyDia).length ? acumular(datasDoMes(addMes(ym, -12)).map((d) => lyDia[d] ?? 0)) : []

  const info = (filtro: (l: LancRow) => boolean, metaV: number, dias: DadosMes['diasLoja'], fator: number) => {
    const ls = lancamentos.filter(filtro)
    const vendaPorDia: Record<string, number> = {}
    for (const l of ls) vendaPorDia[l.data] = (vendaPorDia[l.data] ?? 0) + l.valor
    return infoMes({
      ym, hoje, meta: metaV, dias, vendaPorDia,
      atendimentos: ls.reduce((a, l) => a + l.atendimentos, 0),
      pecas: ls.reduce((a, l) => a + l.pecas, 0),
      valorWhatsapp: ls.reduce((a, l) => a + Number(l.valor_whatsapp ?? 0), 0),
      curvaAnoPassado: curvaAnoPassado.map((v) => v * fator),
    })
  }

  const loja = info(() => true, metaValor, diasLoja, 1)
  const porVendedor: Record<string, InfoMes> = {}
  const pctMap = new Map((pct.data ?? []).map((p) => [p.vendedor_id, Number(p.percentual)]))
  for (const v of vendedores) {
    const cotaV = diasVend[v.id].reduce((a, d) => a + (d.situacao === 'normal' ? d.cota : 0), 0)
    const metaV = cotaV > 0 ? cotaV : (metaValor * (pctMap.get(v.id) ?? 100 / Math.max(1, vendedores.length))) / 100
    // Sem cota por vendedor cadastrada, usa a cota da loja proporcional.
    const dias = cotaV > 0 ? diasVend[v.id] : diasLoja.map((d) => ({ ...d, cota: metaValor ? (d.cota * metaV) / metaValor : 0 }))
    porVendedor[v.id] = info((l) => l.vendedor_id === v.id, metaV, dias, metaValor ? metaV / metaValor : 0)
  }

  return {
    ym,
    meta: metaValor,
    superMeta: Number(meta.data?.super_meta_valor ?? 0),
    superPremio: meta.data?.super_meta_premio ?? '',
    vendedores,
    lancamentos,
    diasLoja,
    diasVend,
    curvaAnoPassado,
    loja,
    porVendedor,
  }
}

/** Configuração: comissão e dias das avaliações. */
export async function carregarConfig(supabase: SupabaseClient) {
  const { data } = await supabase.from('gam_config').select('*').eq('id', 1).maybeSingle()
  return {
    comMeta: Number(data?.com_pct_meta ?? 2),
    comSem: Number(data?.com_pct_sem ?? 1),
    avalMeio: Number(data?.aval_meio ?? 15),
    avalFinalIni: Number(data?.aval_final_ini ?? 20),
    avalFinalFim: Number(data?.aval_final_fim ?? 25),
  }
}
