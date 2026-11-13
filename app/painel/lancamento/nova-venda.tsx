'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { registrarVenda } from './actions'

const inp = 'w-full rounded-lg border border-white/10 bg-[#0b1324] px-3 py-3 text-2xl font-extrabold'

export function NovaVenda() {
  const [st, acao, pend] = useActionState(registrarVenda, null)
  const form = useRef<HTMLFormElement>(null)
  const [origem, setOrigem] = useState<'loja' | 'whatsapp'>('loja')
  useEffect(() => {
    if (st?.ok) form.current?.reset()
  }, [st])
  const btn = (on: boolean, cor: string) =>
    `flex-1 rounded-xl border-2 py-3 text-base font-bold transition-colors ${on ? cor : 'border-white/10 bg-[#16213a] text-slate-300'}`
  return (
    <form ref={form} action={(fd) => { acao(fd); setOrigem('loja') }}>
      <div className="grid grid-cols-[1fr_1.5fr] gap-2.5">
        <div>
          <label className="mb-1 block text-xs text-slate-400">Peças</label>
          <input name="pecas" inputMode="numeric" placeholder="0" className={inp} required />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Valor (R$)</label>
          <input name="valor" inputMode="decimal" placeholder="0,00" className={inp} required />
        </div>
      </div>
      <label className="mb-1 mt-3 block text-xs text-slate-400">De onde veio essa venda?</label>
      <input type="hidden" name="origem" value={origem} />
      <div className="flex gap-2">
        <button type="button" onClick={() => setOrigem('loja')} className={btn(origem === 'loja', 'border-cyan-400 bg-cyan-400/15 text-cyan-200')}>🏪 Loja</button>
        <button type="button" onClick={() => setOrigem('whatsapp')} className={btn(origem === 'whatsapp', 'border-emerald-400 bg-emerald-400/15 text-emerald-200')}>💬 WhatsApp</button>
      </div>
      <button disabled={pend} className="mt-3 w-full rounded-xl bg-cyan-400 py-3.5 text-base font-bold text-[#04111a] hover:bg-cyan-300 disabled:opacity-50">
        {pend ? 'Registrando…' : '+ Registrar venda'}
      </button>
      {st?.error && <p className="mt-2 text-sm text-red-300">{st.error}</p>}
      {st?.ok && <p className="mt-2 text-sm text-emerald-300">✅ {st.ok}</p>}
      <p className="mt-2 text-xs text-slate-400">Cada venda conta 1 atendimento. No fim do dia o sistema soma tudo sozinho.</p>
    </form>
  )
}
