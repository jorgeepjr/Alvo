'use client'

import { useRouter } from 'next/navigation'
import { Label } from '@/components/ui/label'

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

// Seletor de mês/ano que já carrega ao escolher — sem precisar clicar em "Ver".
export function SeletorMesComissao({ mes, ano, anos }: { mes: number; ano: number; anos: number[] }) {
  const router = useRouter()
  const ir = (m: number, a: number) => router.push(`/gestor/comissoes?mes=${m}&ano=${a}`)
  const cls = 'rounded-md bg-slate-800 border border-slate-700 px-2 py-1.5 text-sm'

  return (
    <div className="flex items-end gap-2">
      <div className="space-y-1">
        <Label className="text-xs text-slate-400">Mês</Label>
        <select value={mes} onChange={(e) => ir(Number(e.target.value), ano)} className={cls} aria-label="Mês">
          {MESES.map((nome, i) => <option key={i} value={i + 1}>{nome}</option>)}
        </select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-slate-400">Ano</Label>
        <select value={ano} onChange={(e) => ir(mes, Number(e.target.value))} className={cls} aria-label="Ano">
          {anos.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
    </div>
  )
}
