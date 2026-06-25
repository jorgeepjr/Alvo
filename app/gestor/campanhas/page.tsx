import { createClient } from '@/lib/supabase/server'
import { criarCampanha, mudarStatusCampanha, excluirCampanha } from './actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

const STATUS_INFO: Record<string, { label: string; cls: string }> = {
  ideia: { label: 'Ideia', cls: 'bg-slate-700 text-slate-200' },
  planejada: { label: 'Planejada', cls: 'bg-yellow-600/30 text-yellow-300' },
  feita: { label: 'Feita', cls: 'bg-green-600/30 text-green-300' },
}

export default async function CampanhasPage() {
  const supabase = await createClient()
  const { data: campanhas } = await supabase.from('campanhas').select('*').order('mes').order('ordem').order('criado_em')

  const mesAtual = new Date().getMonth() + 1
  const porMes = new Map<number, typeof campanhas>()
  for (const c of campanhas ?? []) {
    if (!porMes.has(c.mes)) porMes.set(c.mes, [])
    porMes.get(c.mes)!.push(c)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Calendário de Campanhas</h1>
        <p className="text-sm text-zinc-400">Planeje as ações do ano. Marque o que vai fazer e acompanhe o andamento.</p>
      </div>

      <Card className="border-slate-800 bg-slate-900">
        <CardHeader><CardTitle className="text-base">Nova Campanha</CardTitle></CardHeader>
        <CardContent>
          <form action={criarCampanha} className="grid grid-cols-1 sm:grid-cols-6 gap-3 items-end">
            <div className="space-y-1">
              <Label htmlFor="mes">Mês</Label>
              <select id="mes" name="mes" defaultValue={mesAtual} className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm">
                {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="titulo">Título</Label>
              <Input id="titulo" name="titulo" required className="bg-slate-800 border-slate-700" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="descricao">Descrição (opcional)</Label>
              <Input id="descricao" name="descricao" className="bg-slate-800 border-slate-700" />
            </div>
            <Button type="submit" className="bg-zinc-100 text-zinc-950 hover:bg-white font-medium">Adicionar</Button>
          </form>
        </CardContent>
      </Card>

      {MESES.map((nome, i) => {
        const mes = i + 1
        const lista = porMes.get(mes)
        if (!lista || lista.length === 0) return null
        return (
          <Card key={mes} className={`bg-slate-900 ${mes === mesAtual ? 'border-zinc-500' : 'border-slate-800'}`}>
            <CardHeader>
              <CardTitle className="text-base">
                {nome} {mes === mesAtual && <span className="text-xs text-zinc-400">(mês atual)</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {lista.map((c) => {
                const info = STATUS_INFO[c.status] ?? STATUS_INFO.ideia
                return (
                  <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-800 bg-slate-950/40 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{c.titulo} <Badge className={info.cls}>{info.label}</Badge></p>
                      {c.descricao && <p className="text-xs text-slate-400 mt-0.5">{c.descricao}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                      <form action={mudarStatusCampanha.bind(null, c.id, 'ideia')} className="inline">
                        <Button type="submit" size="sm" variant="outline">Ideia</Button>
                      </form>
                      <form action={mudarStatusCampanha.bind(null, c.id, 'planejada')} className="inline">
                        <Button type="submit" size="sm" variant="outline">Planejar</Button>
                      </form>
                      <form action={mudarStatusCampanha.bind(null, c.id, 'feita')} className="inline">
                        <Button type="submit" size="sm" variant="outline">Feita</Button>
                      </form>
                      <form action={excluirCampanha.bind(null, c.id)} className="inline">
                        <Button type="submit" size="sm" variant="destructive">Excluir</Button>
                      </form>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
