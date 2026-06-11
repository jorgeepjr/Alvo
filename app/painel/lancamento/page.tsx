import { createClient } from '@/lib/supabase/server'
import { LancamentoForm } from './lancamento-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function LancamentoVendedorPage({ searchParams }: { searchParams: Promise<{ data?: string }> }) {
  const sp = await searchParams
  const data = sp.data ?? new Date().toISOString().slice(0, 10)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: existente } = await supabase
    .from('lancamentos')
    .select('*')
    .eq('data', data)
    .eq('vendedor_id', user!.id)
    .maybeSingle()

  const { data: distribuicaoDia } = await supabase
    .from('distribuicao_diaria')
    .select('situacao')
    .eq('data', data)
    .is('vendedor_id', null)
    .maybeSingle()

  const diaBloqueado = distribuicaoDia?.situacao === 'feriado' || distribuicaoDia?.situacao === 'fechado'

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Lançar Vendas do Dia</h1>

      <form className="flex gap-2 items-end" method="get">
        <div className="space-y-1">
          <Label htmlFor="data">Data</Label>
          <Input id="data" name="data" type="date" defaultValue={data} className="bg-slate-800 border-slate-700" />
        </div>
        <Button type="submit" variant="outline">Selecionar</Button>
      </form>

      {existente?.dia_fechado && (
        <p className="text-sm text-red-400">O gestor fechou este dia. Os lançamentos estão bloqueados para edição.</p>
      )}
      {!existente?.dia_fechado && diaBloqueado && (
        <p className="text-sm text-red-400">
          {distribuicaoDia?.situacao === 'feriado' ? 'Este dia está marcado como feriado.' : 'A loja está fechada neste dia.'} Não é necessário lançar vendas.
        </p>
      )}
      {existente && !existente.dia_fechado && !diaBloqueado && (
        <p className="text-sm text-yellow-400">Já existe um lançamento para esta data. Salvar irá atualizá-lo.</p>
      )}

      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle className="text-base">{data.split('-').reverse().join('/')}</CardTitle>
        </CardHeader>
        <CardContent>
          <LancamentoForm data={data} existente={existente ?? null} bloqueado={diaBloqueado && !existente?.dia_fechado} />
        </CardContent>
      </Card>
    </div>
  )
}
