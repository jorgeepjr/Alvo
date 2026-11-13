import { createClient } from '@/lib/supabase/server'
import { salvarMetaMensal, gerarDistribuicaoAutomatica, salvarPercentuaisVendedores, gerarDistribuicaoVendedores, usarSugestaoAnoPassado } from './actions'
import { mesSelecionado } from '@/lib/mes-selecionado'
import { vendaDiariaDoMes } from '@/lib/dados-mes'
import { addMes, anoDe, hojeBR, mesDe, mesmoDiaAnoPassado, nomeMes, fimDoMes, inicioDoMes } from '@/lib/datas'
import { TopoPagina } from '@/components/topo-pagina'
import { Aviso, Cartao, R0 } from '@/components/bloco-mes'
import { GerarMetasFuturas } from './gerar-metas-futuras'
import { CalendarioCotas, type DiaCal } from './calendario-cotas'

const inp = 'w-full rounded-lg border border-white/10 bg-[#0b1324] px-3 py-2.5'
const btnP = 'rounded-lg bg-violet-400 px-4 py-2.5 text-sm font-bold text-[#04111a] hover:bg-violet-300 disabled:opacity-40'
const btn = 'rounded-lg border border-white/10 bg-[#16213a] px-4 py-2.5 text-sm font-semibold hover:border-violet-400 disabled:opacity-40'

function Passo({ n, titulo, dica }: { n: number; titulo: string; dica?: string }) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <span className="grid h-6 w-6 place-items-center rounded-full bg-violet-400 text-[13px] font-black text-[#04111a]">{n}</span>
      <h2 className="text-[15.5px] font-semibold">{titulo}</h2>
      {dica && <span className="cursor-help rounded-full border border-white/15 px-1.5 text-[11px] text-slate-400" title={dica}>?</span>}
    </div>
  )
}

export default async function MetasPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const sp = await searchParams
  const ym = await mesSelecionado(sp)
  const ano = anoDe(ym)
  const mes = mesDe(ym)
  const hoje = hojeBR()
  const ini = inicioDoMes(ym)
  const fim = fimDoMes(ym)

  const supabase = await createClient()
  const [{ data: meta }, { data: distribuicao }, { data: vendedores }, { data: percentuais }, { data: lancMes }, { data: histLY }, vendaLY] = await Promise.all([
    supabase.from('metas_mensais').select('*').eq('ano', ano).eq('mes', mes).maybeSingle(),
    supabase.from('distribuicao_diaria').select('*').is('vendedor_id', null).gte('data', ini).lte('data', fim).order('data'),
    supabase.from('profiles').select('*').eq('perfil', 'vendedor').eq('ativo', true).order('nome'),
    supabase.from('metas_vendedor_percentual').select('*').eq('ano', ano).eq('mes', mes),
    supabase.from('lancamentos').select('data, valor').gte('data', ini).lte('data', fim),
    supabase.from('historico_loja').select('venda_total, atendimentos, pecas').eq('ano', ano - 1).eq('mes', mes).maybeSingle(),
    vendaDiariaDoMes(supabase, addMes(ym, -12)),
  ])

  const pctMap = new Map((percentuais ?? []).map((p) => [p.vendedor_id, Number(p.percentual)]))
  const vendidoPorDia = new Map<string, number>()
  for (const l of lancMes ?? []) vendidoPorDia.set(l.data, (vendidoPorDia.get(l.data) ?? 0) + Number(l.valor))

  const metaValor = Number(meta?.meta_valor ?? 0)
  const ly = Number(histLY?.venda_total ?? 0)
  const sug = Math.round((ly * 1.2) / 100) * 100
  const sugAt = Math.round(Number(histLY?.atendimentos ?? 0) * 1.2)
  const sugPc = Math.round(Number(histLY?.pecas ?? 0) * 1.2)

  const linhasDist = distribuicao ?? []
  const acumulados = linhasDist.map((_, k) => linhasDist.slice(0, k + 1).reduce((a, x) => a + (x.situacao === 'normal' ? Number(x.cota_valor) : 0), 0))
  const dias: DiaCal[] = linhasDist.map((d, k) => {
    const l = mesmoDiaAnoPassado(d.data)
    return {
      id: d.id,
      data: d.data,
      situacao: d.situacao,
      cota: Number(d.cota_valor),
      atend: d.cota_atendimentos,
      pecas: d.cota_pecas,
      fixada: !!d.cota_fixada,
      vendido: vendidoPorDia.has(d.data) ? vendidoPorDia.get(d.data)! : null,
      acumulado: acumulados[k],
      ly: vendaLY[l] ? { data: l, valor: vendaLY[l] } : null,
    }
  })
  const soma = dias.filter((d) => d.situacao === 'normal').reduce((a, d) => a + d.cota, 0)
  const somaPct = (vendedores ?? []).reduce((a, v) => a + (pctMap.get(v.id) ?? 0), 0)

  return (
    <div className="space-y-4">
      <TopoPagina
        area="Metas"
        titulo="Metas"
        ym={ym}
        ajuda="/gestor/ajuda#metas"
        descricao={<><b className="text-slate-200">1</b> meta do mês · <b className="text-slate-200">2</b> cota de cada dia · <b className="text-slate-200">3</b> parte de cada vendedor.</>}
      />

      <Cartao>
        <Passo n={1} titulo={`Meta de ${nomeMes(ym)}`} />
        <form action={salvarMetaMensal} className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <input type="hidden" name="ano" value={ano} />
          <input type="hidden" name="mes" value={mes} />
          <input type="hidden" name="meta_atendimentos" value={meta?.meta_atendimentos ?? sugAt} />
          <input type="hidden" name="meta_pecas" value={meta?.meta_pecas ?? sugPc} />
          <div>
            <label className="mb-1 block text-xs text-slate-400">Meta da loja (R$)</label>
            <input name="meta_valor" type="number" step="1" min="0" defaultValue={metaValor ? Math.round(metaValor) : ''} placeholder={sug ? String(sug) : '0'} className={inp} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">🏆 Super meta (opcional)</label>
            <input name="super_meta_valor" type="number" step="1" min="0" defaultValue={meta?.super_meta_valor ? Math.round(Number(meta.super_meta_valor)) : ''} placeholder="—" className={inp} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">Prêmio da super meta</label>
            <input name="super_meta_premio" type="text" defaultValue={meta?.super_meta_premio ?? ''} placeholder="ex.: uma peça pra cada vendedor" className={inp} />
          </div>
          <button type="submit" className={btnP}>Salvar meta</button>
        </form>
        {ly > 0 && (
          <div className="mt-3">
            <Aviso tom="neu" icone="💡" titulo={`Sugestão: ${R0(sug)}`}>
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex-1">
                  {nomeMes(addMes(ym, -12))} vendeu {R0(ly)}. Regra da loja: mesmo mês do ano passado +20%. Usando, cada dia recebe a venda do mesmo dia da semana do ano passado +20%.
                </span>
                {sug !== Math.round(metaValor) && (
                  <form action={usarSugestaoAnoPassado.bind(null, ano, mes, sug, sugAt, sugPc)}>
                    <button className="whitespace-nowrap font-bold text-cyan-300 hover:underline">Usar →</button>
                  </form>
                )}
              </div>
            </Aviso>
          </div>
        )}
      </Cartao>

      <Cartao>
        <div className="flex flex-wrap items-start gap-2">
          <Passo n={2} titulo="Cota de cada dia" dica="Cada dia recebe a venda do mesmo dia da semana do ano passado (364 dias antes, alinha a Black), proporcional à meta. A sobra vai pro último dia. Clique num dia pra mudar a cota: ele fica 📌 fixo, os dias de antes não mudam e a diferença vai pros dias seguintes." />
          {dias.length > 0 && (
            <span className="ml-auto text-sm text-slate-400">
              soma: <b className={Math.abs(soma - metaValor) < 1 ? 'text-emerald-300' : 'text-amber-300'}>{R0(soma)} {Math.abs(soma - metaValor) < 1 ? '✅' : '⚠️'}</b>
            </span>
          )}
        </div>
        {dias.length ? (
          <>
            <CalendarioCotas dias={dias} hoje={hoje} ano={ano} mes={mes} />
            {Math.abs(soma - metaValor) >= 1 && metaValor > 0 && (
              <p className="mt-2 text-xs text-amber-300">
                {soma < metaValor ? 'Falta' : 'Passou'} {R0(Math.abs(metaValor - soma))} da meta. Solte um dia 📌 pro sistema ajustar.
              </p>
            )}
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-semibold text-violet-300">Refazer a distribuição do mês inteiro</summary>
              <form action={gerarDistribuicaoAutomatica} className="mt-2 flex flex-wrap items-center gap-3">
                <input type="hidden" name="ano" value={ano} />
                <input type="hidden" name="mes" value={mes} />
                <button className={btn}>Refazer como o ano passado</button>
                <span className="text-xs text-slate-400">Apaga os 📌 e as cotas dos dias que já passaram, e distribui tudo de novo.</span>
              </form>
            </details>
          </>
        ) : (
          <form action={gerarDistribuicaoAutomatica} className="flex flex-wrap items-center gap-3">
            <input type="hidden" name="ano" value={ano} />
            <input type="hidden" name="mes" value={mes} />
            <button className={btnP} disabled={!meta}>Distribuir a meta pelos dias</button>
            {!meta && <span className="text-xs text-slate-400">Salve a meta primeiro.</span>}
          </form>
        )}
      </Cartao>

      <Cartao>
        <Passo n={3} titulo="Parte de cada vendedor" />
        <form action={salvarPercentuaisVendedores.bind(null, ano, mes)} className="space-y-2">
          {(vendedores ?? []).map((v) => {
            const pct = pctMap.get(v.id) ?? 0
            return (
              <div key={v.id} className="flex items-center gap-3">
                <b className="w-24">{v.nome}</b>
                <input name={`pct_${v.id}`} type="number" step="0.01" min={0} max={100} defaultValue={pct} className={`${inp} w-28`} />
                <span className="text-sm text-slate-400">% · {R0((metaValor * pct) / 100)}</span>
              </div>
            )
          })}
          <p className="text-xs text-slate-400">A soma tem que dar 100%. Hoje: <b className={Math.abs(somaPct - 100) < 0.01 ? 'text-emerald-300' : 'text-amber-300'}>{somaPct}%</b></p>
          <button className={btn}>Salvar percentuais</button>
        </form>
        <form action={gerarDistribuicaoVendedores} className="mt-3">
          <input type="hidden" name="ano" value={ano} />
          <input type="hidden" name="mes" value={mes} />
          <button className={btn} disabled={!meta || !vendedores?.length}>Refazer a cota de cada vendedor</button>
        </form>
      </Cartao>

      <details className="rounded-2xl border border-white/10 bg-[#111a2d] p-4">
        <summary className="cursor-pointer text-sm font-semibold text-violet-300">Metas dos próximos 12 meses (automático)</summary>
        <p className="my-2 text-xs text-slate-400">Cria as metas que ainda não existem, a partir do histórico. Não mexe nas metas já definidas.</p>
        <GerarMetasFuturas ano={ano} mes={mes} />
      </details>
    </div>
  )
}
