'use client'

import { useActionState } from 'react'
import { salvarLancamentoVendedor } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Lancamento = {
  atendimentos: number
  pecas: number
  valor: number
  observacao: string | null
  situacao_vendedor: string
  dia_fechado: boolean
} | null

export function LancamentoForm({ data, existente, bloqueado }: { data: string; existente: Lancamento; bloqueado?: boolean }) {
  const [state, formAction] = useActionState(salvarLancamentoVendedor, null)
  const fechado = (existente?.dia_fechado ?? false) || (bloqueado ?? false)

  return (
    <form action={formAction} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <input type="hidden" name="data" value={data} />

      {state?.error && (
        <p className="sm:col-span-2 text-sm text-red-400">{state.error}</p>
      )}
      {state?.success && (
        <p className="sm:col-span-2 text-sm text-green-400">Lançamento salvo com sucesso.</p>
      )}

      <div className="space-y-1">
        <Label htmlFor="atendimentos">Atendimentos</Label>
        <Input id="atendimentos" name="atendimentos" type="number" defaultValue={existente?.atendimentos ?? 0} disabled={fechado} className="bg-slate-800 border-slate-700" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="pecas">Peças</Label>
        <Input id="pecas" name="pecas" type="number" defaultValue={existente?.pecas ?? 0} disabled={fechado} className="bg-slate-800 border-slate-700" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="valor">Valor (R$)</Label>
        <Input id="valor" name="valor" type="number" step="0.01" defaultValue={existente?.valor ?? 0} disabled={fechado} className="bg-slate-800 border-slate-700" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="situacao_vendedor">Situação</Label>
        <select id="situacao_vendedor" name="situacao_vendedor" defaultValue={existente?.situacao_vendedor ?? 'normal'} disabled={fechado} className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm">
          <option value="normal">Normal</option>
          <option value="atestado">Atestado</option>
          <option value="nao_trabalhou">Não trabalhou</option>
        </select>
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="observacao">Observação</Label>
        <Input id="observacao" name="observacao" defaultValue={existente?.observacao ?? ''} disabled={fechado} className="bg-slate-800 border-slate-700" />
      </div>
      <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 sm:col-span-2" disabled={fechado}>
        Salvar
      </Button>
    </form>
  )
}
