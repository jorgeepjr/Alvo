'use client'

import { useActionState, useEffect, useRef } from 'react'
import { registrarVenda } from './actions'

const inp = 'w-full rounded-lg border border-white/10 bg-[#0b1324] px-3 py-3 text-2xl font-extrabold'

export function NovaVenda() {
  const [st, acao, pend] = useActionState(registrarVenda, null)
  const form = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (st?.ok) form.current?.reset()
  }, [st])
  return (
    <form ref={form} action={acao}>
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
      <label className="mt-3 flex items-center gap-2 text-[15px]">
        <input type="checkbox" name="whatsapp" className="h-4 w-4" /> 💬 Esse cliente veio pelo WhatsApp
      </label>
      <button disabled={pend} className="mt-3 w-full rounded-xl bg-cyan-400 py-3.5 text-base font-bold text-[#04111a] hover:bg-cyan-300 disabled:opacity-50">
        {pend ? 'Registrando…' : '+ Registrar venda'}
      </button>
      {st?.error && <p className="mt-2 text-sm text-red-300">{st.error}</p>}
      {st?.ok && <p className="mt-2 text-sm text-emerald-300">✅ {st.ok}</p>}
      <p className="mt-2 text-xs text-slate-400">Cada venda conta 1 atendimento. No fim do dia o sistema soma tudo sozinho.</p>
    </form>
  )
}
