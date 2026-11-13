import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { salvarLancamentoGestor, apagarLancamento } from './actions'
import { mesSelecionado } from '@/lib/mes-selecionado'
import { datasDoMes, ddmm, DIAS_SEMANA, diaSemana, fimDoMes, hojeBR, inicioDoMes, nomeMes, ymDe } from '@/lib/datas'
import { TopoPagina } from '@/components/topo-pagina'
import { Aviso, Cartao, R } from '@/components/bloco-mes'
import { FormNumeros } from './form-numeros'

function Passo({ n, titulo, dica }: { n: number; titulo: string; dica?: string }) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <span className="grid h-6 w-6 place-items-center rounded-full bg-cyan-400 text-[13px] font-black text-[#04111a]">{n}</span>
      <h2 className="text-[15.5px] font-semibold">{titulo}</h2>
      {dica && <span className="cursor-help rounded-full border border-white/15 px-1.5 text-[11px] text-slate-400" title={dica}>?</span>}
    </div>
  )
}

const chip = (on: boolean) =>
  `rounded-full border px-3.5 py-2 text-sm ${on ? 'border-cyan-400 bg-cyan-400 font-extrabold text-[#04111a]' : 'border-white/10 bg-[#16213a] hover:border-cyan-400'}`

export default async function LancarVendas({ searchParams }: { searchParams: Promise<{ data?: string; vendedor?: string; mes?: string; ok?: string }> }) {
  const sp = await searchParams
  const hoje = hojeBR()
  const supabase = await createClient()
  const ymSel = await mesSelecionado(sp)
  const ym = ymSel > ymDe(hoje) ? ymDe(hoje) : ymSel

  const { data: vendedores } = await supabase.from('profiles').select('id, nome').eq('perfil', 'vendedor').eq('ativo', true).order('nome')
  const quem = [...(vendedores ?? []), { id: 'loja', nome: 'Loja' }]
  const { data: distLoja } = await supabase.from('distribuicao_diaria').select('data, situacao').is('vendedor_id', null).gte('data', inicioDoMes(ym)).lte('data', fimDoMes(ym))
  const sit = new Map((distLoja ?? []).map((d) => [d.data, d.situacao]))
  const situacao = (d: string) => sit.get(d) ?? (diaSemana(d) === 0 ? 'fechado' : 'normal')

  // Dia padrão: o último dia útil antes de hoje (o caixa é fechado depois)
  const uteisAteHoje = datasDoMes(ymDe(hoje)).filter((d) => d <= hoje && situacao(d) === 'normal')
  const padrao = [...uteisAteHoje].filter((d) => d < hoje).pop() ?? hoje
  const data = sp.data && /^\d{4}-\d{2}-\d{2}$/.test(sp.data) && sp.data <= hoje ? sp.data : padrao
  const vendedor = quem.some((q) => q.id === sp.vendedor) ? sp.vendedor! : quem[0].id
  const ultimos4 = uteisAteHoje.slice(-4)

  const [{ data: lancMes }, { data: vendasDia }, { data: perfis }] = await Promise.all([
    supabase.from('lancamentos').select('*').gte('data', inicioDoMes(ym)).lte('data', fimDoMes(ym)),
    supabase.from('vendas').select('*').eq('data', data).eq('vendedor_id', vendedor === 'loja' ? '00000000-0000-0000-0000-000000000000' : vendedor).order('hora'),
    supabase.from('profiles').select('id, nome'),
  ])
  // o lançamento escolhido pode ser de outro mês (dia escolhido no calendário)
  const { data: ex } = await (vendedor === 'loja'
    ? supabase.from('lancamentos').select('*').eq('data', data).is('vendedor_id', null).maybeSingle()
    : supabase.from('lancamentos').select('*').eq('data', data).eq('vendedor_id', vendedor).maybeSingle())
  const nomeDe = (id: string | null) => perfis?.find((p) => p.id === id)?.nome ?? '—'
  const nomeQuem = quem.find((q) => q.id === vendedor)?.nome
  const lancado = new Set((lancMes ?? []).map((l) => `${l.vendedor_id ?? 'loja'}|${l.data}`))
  const dias = datasDoMes(ym).filter((d) => d <= hoje)
  const totalMes = (lancMes ?? []).reduce((a, l) => a + Number(l.valor), 0)
  const corrigidoEm = ex?.corrigido_em
    ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(ex.corrigido_em))
    : null
  const href = (d: string, v: string) => `/gestor/lancamento?data=${d}&vendedor=${v}`

  return (
    <div className="space-y-4">
      <TopoPagina area="Hoje" titulo="Lançar vendas" ym={ymSel} ajuda="/gestor/ajuda#lancar" descricao={<>Três números por vendedor: <b className="text-slate-200">atendimentos, peças e valor</b>. O que você salva aqui é o número oficial do dia.</>} />

      {sp.ok && <Aviso tom="ok" icone="✅" titulo={`Lançado: ${nomeQuem} · ${ddmm(data)} · ${R(Number(ex?.valor ?? 0))}`} />}

      <div className="grid items-start gap-4 lg:grid-cols-[1.25fr_1fr]">
        <Cartao id="lForm">
          <Passo n={1} titulo="Qual dia?" dica="Os vendedores só registram o dia de hoje, venda por venda. Dia que passou, só você lança ou corrige, e fica marcado que foi corrigido." />
          <div className="mb-4 flex flex-wrap items-center gap-1.5">
            {ultimos4.map((d) => (
              <Link key={d} href={href(d, vendedor)} className={chip(d === data)}>
                {d === hoje ? 'Hoje' : DIAS_SEMANA[diaSemana(d)]} {ddmm(d)}
              </Link>
            ))}
            {!ultimos4.includes(data) && <span className={chip(true)}>{DIAS_SEMANA[diaSemana(data)]} {ddmm(data)}/{data.slice(2, 4)}</span>}
            <form className="flex items-center gap-1.5 text-sm">
              <input type="hidden" name="vendedor" value={vendedor} />
              📅 Outro dia:
              <input type="date" name="data" max={hoje} defaultValue={data} className="rounded-lg border border-white/10 bg-[#0b1324] px-2 py-1.5 text-sm" />
              <button className="rounded-lg border border-white/10 px-2 py-1.5 text-xs">ir</button>
            </form>
          </div>

          <Passo n={2} titulo="Quem vendeu?" />
          <div className="mb-4 flex flex-wrap gap-1.5">
            {quem.map((q) => (
              <Link key={q.id} href={href(data, q.id)} className={chip(q.id === vendedor)} title={q.id === 'loja' ? 'Venda feita por você ou sem vendedor' : undefined}>
                {q.nome}
              </Link>
            ))}
          </div>

          <Passo n={3} titulo="Os números do dia" dica="Cada atendimento que virou venda conta 1. É o mesmo número de tickets do Criar." />
          {situacao(data) !== 'normal' && <p className="mb-2 text-sm text-amber-300">⚠️ Esse dia está marcado como {situacao(data)} em Metas.</p>}
          <form action={salvarLancamentoGestor} key={`${data}-${vendedor}`}>
            <input type="hidden" name="data" value={data} />
            <input type="hidden" name="vendedor_id" value={vendedor} />
            <FormNumeros at={ex?.atendimentos} pc={ex?.pecas} val={ex ? Number(ex.valor) : undefined} wa={Number(ex?.valor_whatsapp ?? 0)} existe={!!ex} />
          </form>

          {(vendasDia?.length ?? 0) > 0 && (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-semibold text-cyan-300">Ver as {vendasDia!.length} vendas que {nomeQuem} registrou nesse dia</summary>
              <table className="mt-2 w-full text-sm">
                <tbody>
                  {vendasDia!.map((s) => (
                    <tr key={s.id} className="border-b border-white/5">
                      <td className="py-1.5 text-slate-400">{s.hora}</td>
                      <td>{s.pecas} peça{s.pecas > 1 ? 's' : ''}{s.whatsapp ? ' · 💬' : ''}</td>
                      <td className="text-right">{R(Number(s.valor))}</td>
                    </tr>
                  ))}
                  <tr><td colSpan={2} className="pt-1.5 text-slate-400">Soma ({vendasDia!.length} atend. · {vendasDia!.reduce((a, s) => a + s.pecas, 0)} peças)</td><td className="pt-1.5 text-right font-bold">{R(vendasDia!.reduce((a, s) => a + Number(s.valor), 0))}</td></tr>
                </tbody>
              </table>
            </details>
          )}
          {corrigidoEm && <p className="mt-2 text-sm text-amber-300">✏️ Corrigido por {nomeDe(ex!.corrigido_por)} em {corrigidoEm}</p>}
          {ex && (
            <div className="mt-2.5 flex items-center gap-3">
              <p className="text-xs text-slate-400">Esse dia já foi lançado. Mudar os números atualiza.</p>
              <form action={apagarLancamento.bind(null, ex.id, data, vendedor)} className="ml-auto">
                <button className="rounded-lg border border-white/10 px-3 py-1.5 text-xs hover:border-red-400" title="Apaga só este lançamento (este vendedor, este dia).">🗑️ Apagar</button>
              </form>
            </div>
          )}
        </Cartao>

        <Cartao id="lCal" titulo={`🗓️ Quem lançou em ${nomeMes(ym)}`}>
          <div className="overflow-x-auto">
            <div className="grid gap-[3px] text-[11px]" style={{ gridTemplateColumns: `64px repeat(${dias.length}, minmax(18px, 1fr))` }}>
              <span />
              {dias.map((d) => <span key={d} className="text-center text-slate-500">{Number(d.slice(8))}</span>)}
              {quem.map((q) => (
                <Linha key={q.id} q={q} dias={dias} hoje={hoje} situacao={situacao} lancado={lancado} sel={{ data, vendedor }} href={href} />
              ))}
            </div>
          </div>
          <p className="mt-2.5 text-xs text-slate-400">Clique em qualquer dia pra lançar ou corrigir. Verde: lançado. Vermelho: dia útil sem lançamento. Pra outro mês, use as setas lá em cima.</p>
          <p className="mt-1.5 text-xs text-slate-400">Lançado no mês: <b className="text-slate-100">{R(totalMes)}</b></p>
        </Cartao>
      </div>
    </div>
  )
}

function Linha({ q, dias, hoje, situacao, lancado, sel, href }: {
  q: { id: string; nome: string }
  dias: string[]
  hoje: string
  situacao: (d: string) => string
  lancado: Set<string>
  sel: { data: string; vendedor: string }
  href: (d: string, v: string) => string
}) {
  return (
    <>
      <b className="truncate text-xs">{q.nome}</b>
      {dias.map((d) => {
        const ok = lancado.has(`${q.id}|${d}`)
        const s = d === sel.data && q.id === sel.vendedor ? ' outline outline-2 outline-offset-1 outline-cyan-400' : ''
        if (situacao(d) !== 'normal' && !ok) return <span key={d} className="grid h-[22px] place-items-center rounded bg-[#0f1729] text-slate-600">·</span>
        // A linha "Loja" é opcional: dia sem venda da loja não é pendência.
        const cls = ok ? 'bg-emerald-400/15 text-emerald-300' : d === hoje || q.id === 'loja' ? 'text-slate-600' : 'bg-red-400/15 text-red-300'
        return (
          <Link key={d} href={href(d, q.id)} title={`${ok ? 'Ver ou corrigir' : 'Lançar'} ${ddmm(d)}`} className={`grid h-[22px] place-items-center rounded font-bold hover:outline hover:outline-1 hover:outline-cyan-400 ${cls}${s}`}>
            {ok ? '✓' : d === hoje || q.id === 'loja' ? '·' : '!'}
          </Link>
        )
      })}
    </>
  )
}
