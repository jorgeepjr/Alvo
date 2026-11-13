'use client'

import { useState } from 'react'

const R = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const n = (s: string) => Number(String(s).replace(/\./g, '').replace(',', '.')) || 0
const inp = 'w-full rounded-lg border border-white/10 bg-[#0b1324] px-3 py-3 text-2xl font-extrabold'

// Os 3 números do dia, grandes pra lançar rápido. Embaixo aparecem ticket, PA e preço médio.
export function FormNumeros({ at, pc, val, wa, existe }: { at?: number; pc?: number; val?: number; wa?: number; existe: boolean }) {
  const [a, setA] = useState(at ? String(at) : '')
  const [p, setP] = useState(pc ? String(pc) : '')
  const [v, setV] = useState(val ? String(val).replace('.', ',') : '')
  const A = n(a)
  const Pc = n(p)
  const V = n(v)
  return (
    <>
      <div className="grid grid-cols-3 gap-2.5">
        <div>
          <label className="mb-1 block text-xs text-slate-400">Atendimentos</label>
          <input name="atendimentos" inputMode="numeric" value={a} onChange={(e) => setA(e.target.value)} placeholder="0" className={inp} required />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Peças</label>
          <input name="pecas" inputMode="numeric" value={p} onChange={(e) => setP(e.target.value)} placeholder="0" className={inp} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Valor (R$)</label>
          <input name="valor" inputMode="decimal" value={v} onChange={(e) => setV(e.target.value)} placeholder="0,00" className={inp} required />
        </div>
      </div>
      <div className="mt-3">
        <label className="mb-1 block text-xs text-slate-400" title="Cliente que comprou depois de mensagem ou áudio (reativação, lista, pós-venda). É o único jeito de saber se o WhatsApp está trazendo venda.">
          Dessas vendas, quanto veio do WhatsApp? <span className="text-slate-500">(opcional)</span>
        </label>
        <input name="valor_whatsapp" inputMode="decimal" defaultValue={wa ? String(wa).replace('.', ',') : ''} placeholder="0,00" className="w-full rounded-lg border border-white/10 bg-[#0b1324] px-3 py-2.5" />
      </div>
      {A > 0 && (
        <p className="mt-2.5 text-sm text-slate-400">
          Ticket médio <b className="text-slate-100">{R(V / A)}</b> · PA <b className="text-slate-100">{(Pc / A).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</b> · preço médio <b className="text-slate-100">{Pc ? R(V / Pc) : '—'}</b>
        </p>
      )}
      <button className="mt-3 w-full rounded-xl bg-cyan-400 py-3.5 text-base font-bold text-[#04111a] hover:bg-cyan-300">
        {existe ? 'Atualizar lançamento' : 'Salvar lançamento'}
      </button>
    </>
  )
}
