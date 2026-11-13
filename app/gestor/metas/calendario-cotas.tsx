'use client'

import { useState, useTransition } from 'react'
import { ajustarCotaDia, ajustarDiaSituacao, liberarDia } from './actions'
import { DIAS_SEMANA, diaSemana, ddmm } from '@/lib/datas'

export interface DiaCal {
  id: string
  data: string
  situacao: 'normal' | 'feriado' | 'fechado'
  cota: number
  atend: number
  pecas: number
  fixada: boolean
  vendido: number | null
  acumulado: number
  ly: { data: string; valor: number } | null
}

const R = (v: number) => `R$ ${Math.round(v).toLocaleString('pt-BR')}`

// Calendário da cota de cada dia. Clique num dia pra mudar a cota ou marcar
// feriado/fechado. O dia salvo fica 📌; os de antes não mudam e a diferença
// vai só pros dias seguintes.
export function CalendarioCotas({ dias, hoje, ano, mes }: { dias: DiaCal[]; hoje: string; ano: number; mes: number }) {
  const [aberto, setAberto] = useState<DiaCal | null>(null)
  const [pend, start] = useTransition()
  const vazio = dias.length ? diaSemana(dias[0].data) : 0
  const anoLY = String(ano - 1).slice(2)

  const rodar = (fn: () => Promise<void>) =>
    start(async () => {
      await fn()
      setAberto(null)
    })

  return (
    <>
      <div className="grid grid-cols-7 gap-1.5">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="text-center text-xs font-bold text-slate-400">{d}</div>
        ))}
        {Array.from({ length: vazio }, (_, i) => <div key={`v${i}`} />)}
        {dias.map((d) => {
          const off = d.situacao !== 'normal'
          const passou = d.data < hoje
          return (
            <button
              key={d.id}
              onClick={() => setAberto(d)}
              className={`relative min-h-24 rounded-xl border p-1.5 text-left text-xs transition-colors hover:border-violet-400 ${
                off ? 'border-white/5 bg-[#16213a]/60 opacity-50' : 'border-white/10 bg-[#16213a]'
              } ${d.data === hoje ? 'outline outline-2 outline-violet-400' : ''}`}
            >
              <div className="text-[13px] font-extrabold">{Number(d.data.slice(8))}</div>
              {d.fixada && !off && <span className="absolute right-1.5 top-1.5 text-[11px]" title="Cota salva por você">📌</span>}
              {off ? (
                <div className="mt-1.5 text-slate-400">{d.situacao}</div>
              ) : (
                <>
                  <div className="mt-1 text-[13px] font-bold">{R(d.cota)}</div>
                  <div className="text-[10.5px] text-slate-400">acum. {R(d.acumulado)}</div>
                  {d.ly && <div className="text-[10.5px] text-slate-500" title={`Venda de ${ddmm(d.ly.data)} no ano passado (mesmo dia da semana)`}>{anoLY}: {R(d.ly.valor)}</div>}
                  {passou && d.vendido !== null && (
                    <div className={`text-[11.5px] font-semibold ${d.vendido >= d.cota ? 'text-emerald-300' : 'text-red-300'}`}>
                      {d.vendido >= d.cota ? '▲' : '▼'} {R(d.vendido)}
                    </div>
                  )}
                  {passou && d.vendido === null && <div className="text-[11px] font-semibold text-red-300">sem lançamento</div>}
                </>
              )}
            </button>
          )
        })}
      </div>

      {aberto && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={(e) => e.target === e.currentTarget && setAberto(null)}>
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111a2d] p-5">
            <h2 className="mb-3 text-lg font-bold">
              {DIAS_SEMANA[diaSemana(aberto.data)]}, {ddmm(aberto.data)}
            </h2>
            <label className="mb-1 block text-xs text-slate-400">Situação</label>
            <div className="mb-4 flex gap-2">
              {(['normal', 'feriado', 'fechado'] as const).map((s) => (
                <button
                  key={s}
                  disabled={pend}
                  onClick={() => s !== aberto.situacao && rodar(() => ajustarDiaSituacao(aberto.id, s))}
                  className={`rounded-full border px-3.5 py-1.5 text-sm ${aberto.situacao === s ? 'border-violet-400 bg-violet-400 font-bold text-[#04111a]' : 'border-white/10 bg-[#16213a]'}`}
                >
                  {s}
                </button>
              ))}
            </div>
            {aberto.situacao === 'normal' && (
              <form
                action={(fd) => rodar(() => ajustarCotaDia(aberto.id, ano, mes, fd))}
              >
                <label className="mb-1 block text-xs text-slate-400">Cota do dia (R$)</label>
                <input name="cota_valor" type="number" step="100" min="0" defaultValue={Math.round(aberto.cota)} className="w-full rounded-lg border border-white/10 bg-[#0b1324] px-3 py-2.5 text-lg" autoFocus />
                <input type="hidden" name="cota_atendimentos" value={aberto.atend} />
                <input type="hidden" name="cota_pecas" value={aberto.pecas} />
                <p className="mt-2 text-xs text-slate-400">
                  Salvando, o dia fica 📌 fixo. Os dias de antes não mudam: a diferença vai só pros dias seguintes, e a soma continua fechando na meta.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {aberto.fixada && (
                    <button type="button" disabled={pend} onClick={() => rodar(() => liberarDia(aberto.id, ano, mes))} className="rounded-lg border border-white/10 px-3 py-2 text-sm">
                      Soltar 📌
                    </button>
                  )}
                  <button type="button" onClick={() => setAberto(null)} className="ml-auto rounded-lg border border-white/10 px-3 py-2 text-sm">Cancelar</button>
                  <button type="submit" disabled={pend} className="rounded-lg bg-violet-400 px-4 py-2 text-sm font-bold text-[#04111a]">
                    {pend ? 'Salvando…' : 'Salvar'}
                  </button>
                </div>
              </form>
            )}
            {aberto.situacao !== 'normal' && (
              <div className="flex justify-end">
                <button onClick={() => setAberto(null)} className="rounded-lg border border-white/10 px-3 py-2 text-sm">Fechar</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
