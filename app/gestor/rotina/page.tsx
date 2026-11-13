import { createClient } from '@/lib/supabase/server'
import { adicionarHabito, salvarHabito, tirarHabito } from './actions'
import { addDias, ddmm, DIAS_SEMANA, diaSemana, hojeBR } from '@/lib/datas'
import { TopoPagina } from '@/components/topo-pagina'
import { Cartao, Tag } from '@/components/bloco-mes'

export default async function RotinaPage() {
  const hoje = hojeBR()
  // Semana de segunda a sábado que contém hoje
  const seg = addDias(hoje, -((diaSemana(hoje) + 6) % 7))
  const semana = Array.from({ length: 6 }, (_, i) => addDias(seg, i))

  const supabase = await createClient()
  const [{ data: habitos }, { data: vendedores }, { data: feitos }] = await Promise.all([
    supabase.from('habitos').select('*').eq('ativo', true).order('ordem'),
    supabase.from('profiles').select('id, nome').eq('perfil', 'vendedor').eq('ativo', true).order('nome'),
    supabase.from('habitos_feitos').select('vendedor_id, data, habito_id').gte('data', semana[0]).lte('data', semana[5]),
  ])
  const H = habitos ?? []
  const ativos = new Set(H.map((h) => h.id))
  const conta = (v: string, d: string) => (feitos ?? []).filter((f) => f.vendedor_id === v && f.data === d && ativos.has(f.habito_id)).length

  return (
    <div className="space-y-4">
      <TopoPagina area="Equipe" titulo="Rotina (hábitos)" ajuda="/gestor/ajuda#rotina" descricao={<>No máximo <b className="text-slate-200">5 hábitos</b> por dia. Simples de marcar, fácil de cobrar.</>} />
      <div className="grid items-start gap-4 lg:grid-cols-[1.25fr_1fr]">
        <Cartao titulo={`✅ Os ${H.length} hábitos de todo dia`} extra={<span className="cursor-help rounded-full border border-white/15 px-1.5 text-[11px] text-slate-400" title="Poucos hábitos, medidos todo dia. Antes eram 203 itens e quase ninguém marcava. O máximo é 5, de propósito.">?</span>}>
          {H.map((h) => (
            <div key={h.id} className="mb-2.5 flex items-start gap-2">
              <form action={salvarHabito.bind(null, h.id)} className="flex-1">
                <div className="flex gap-2">
                  <input name="texto" defaultValue={h.texto} className="w-full rounded-lg border border-white/10 bg-[#0b1324] px-3 py-2" />
                  <button className="rounded-lg border border-white/10 px-3 text-xs">Salvar</button>
                </div>
                {h.porque && <div className="mt-1 text-xs text-slate-400">💡 {h.porque}</div>}
              </form>
              <form action={tirarHabito.bind(null, h.id)}>
                <button className="rounded-lg border border-white/10 px-2.5 py-2 text-xs hover:border-red-400" title="Tirar este hábito (o histórico fica guardado)">✕</button>
              </form>
            </div>
          ))}
          {H.length < 5 && (
            <form action={adicionarHabito}>
              <button className="rounded-lg border border-white/10 bg-[#16213a] px-3 py-2 text-sm">+ Hábito</button>
            </form>
          )}
          <p className="mt-2 text-xs text-slate-400">O texto dá pra mudar. O máximo é 5: com mais que isso ninguém marca.</p>
        </Cartao>

        <Cartao titulo="Quem cumpriu · esta semana">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-400">
                <th />
                {semana.map((d) => <th key={d} className="py-1 text-right font-semibold">{DIAS_SEMANA[diaSemana(d)]} <span className="font-normal">{ddmm(d)}</span></th>)}
              </tr>
            </thead>
            <tbody>
              {(vendedores ?? []).map((v) => (
                <tr key={v.id} className="border-t border-white/5">
                  <td className="py-2 font-bold">{v.nome}</td>
                  {semana.map((d) => {
                    if (d > hoje) return <td key={d} className="text-right text-slate-600">·</td>
                    const n = conta(v.id, d)
                    return <td key={d} className="text-right"><Tag tom={n >= H.length && H.length ? 'ok' : n ? 'warn' : 'bad'}>{n}/{H.length}</Tag></td>
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-slate-400">Os vendedores marcam no &quot;Meu dia&quot;. Verde: fez todos. Amarelo: parte. Vermelho: nenhum.</p>
        </Cartao>
      </div>
    </div>
  )
}
