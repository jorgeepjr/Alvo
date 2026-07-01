'use client'

import { useActionState, useEffect, useRef } from 'react'
import { adicionarVendaRapida } from './lancamento/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatBRL } from '@/lib/calculos'

type TotalDia = { atendimentos: number; pecas: number; valor: number; vendas: number } | null

export function VendaRapidaForm({ data, totalDia }: { data: string; totalDia: TotalDia }) {
  const [state, formAction] = useActionState(adicionarVendaRapida, null)
  const formRef = useRef<HTMLFormElement>(null)

  // Limpa os campos após adicionar com sucesso, para a próxima venda
  useEffect(() => {
    if (state?.success) formRef.current?.reset()
  }, [state])

  return (
    <div className="space-y-3">
      {totalDia && (totalDia.valor > 0 || totalDia.atendimentos > 0) && (
        <div className="rounded-md bg-slate-950/50 border border-slate-800 px-3 py-2 text-sm flex flex-wrap gap-x-4 gap-y-1">
          <span className="text-slate-400">Acumulado hoje:</span>
          <span className="text-slate-200 font-semibold">R$ {formatBRL(totalDia.valor)}</span>
          <span className="text-slate-400">{totalDia.atendimentos} atend.</span>
          <span className="text-slate-400">{totalDia.vendas} vendas</span>
          <span className="text-slate-400">{totalDia.pecas} peças</span>
        </div>
      )}

      <form ref={formRef} action={formAction} className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
        <input type="hidden" name="data" value={data} />

        {state?.error && <p className="col-span-2 sm:col-span-5 text-sm text-red-400">{state.error}</p>}
        {state?.success && <p className="col-span-2 sm:col-span-5 text-sm text-green-400">Venda adicionada ao total do dia!</p>}

        <div className="space-y-1">
          <Label htmlFor="vr-atendimentos">Atendimentos</Label>
          <Input id="vr-atendimentos" name="atendimentos" type="number" min="0" placeholder="0" className="bg-slate-800 border-slate-700" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="vr-vendas">Vendas</Label>
          <Input id="vr-vendas" name="vendas" type="number" min="0" placeholder="0" className="bg-slate-800 border-slate-700" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="vr-pecas">Peças</Label>
          <Input id="vr-pecas" name="pecas" type="number" min="0" placeholder="0" className="bg-slate-800 border-slate-700" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="vr-valor">Valor (R$)</Label>
          <Input id="vr-valor" name="valor" type="text" inputMode="decimal" placeholder="0,00" className="bg-slate-800 border-slate-700" />
        </div>
        <Button type="submit" className="bg-green-600 hover:bg-green-500">+ Adicionar</Button>
      </form>

      <p className="text-xs text-slate-500">
        &quot;Atendimentos&quot; = pessoas atendidas · &quot;Vendas&quot; = quantas compraram (para a taxa de conversão).
      </p>

      <p className="text-xs text-slate-500">
        Cada venda lançada aqui soma ao total do dia. Para corrigir o total, use a página &quot;Lançar Vendas&quot;.
      </p>
    </div>
  )
}
