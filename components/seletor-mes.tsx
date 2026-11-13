'use client'

import { usePathname, useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addMes, nomeMes } from '@/lib/datas'

// Seletor de mês único: o mês escolhido vale pra tela toda e continua
// valendo ao trocar de tela (cookie da sessão). "hoje" volta pro mês atual.
export function SeletorMes({ ym, ymHoje }: { ym: string; ymHoje: string }) {
  const router = useRouter()
  const pathname = usePathname()

  function ir(novo: string) {
    if (novo === ymHoje) document.cookie = 'mf_mes=; path=/; max-age=0'
    else document.cookie = `mf_mes=${novo}; path=/; samesite=lax`
    router.push(`${pathname}?mes=${novo}`)
  }

  return (
    <div
      className="flex items-center gap-1 rounded-xl border border-white/10 bg-[#111a2d] p-1"
      title="O mês escolhido aqui vale pra tela toda. Volte pro mês anterior pra fazer o fechamento."
    >
      <button onClick={() => ir(addMes(ym, -1))} className="rounded-lg p-1.5 hover:bg-white/5" aria-label="Mês anterior">
        <ChevronLeft className="h-4 w-4" />
      </button>
      <b className="min-w-32 text-center text-sm">{nomeMes(ym)}</b>
      <button onClick={() => ir(addMes(ym, 1))} className="rounded-lg p-1.5 hover:bg-white/5" aria-label="Próximo mês">
        <ChevronRight className="h-4 w-4" />
      </button>
      {ym !== ymHoje && (
        <button onClick={() => ir(ymHoje)} className="rounded-lg px-2 py-1 text-xs font-bold text-cyan-300 hover:bg-white/5">
          hoje
        </button>
      )}
    </div>
  )
}
