import { createClient } from '@/lib/supabase/server'
import { criarTarefa, excluirTarefa, alternarConclusaoTarefa } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export default async function TarefasPage({ searchParams }: { searchParams: Promise<{ data?: string }> }) {
  const sp = await searchParams
  const data = sp.data ?? new Date().toISOString().slice(0, 10)

  const supabase = await createClient()
  const { data: vendedores } = await supabase.from('profiles').select('*').eq('perfil', 'vendedor').eq('ativo', true).order('nome')
  const { data: tarefas } = await supabase.from('tarefas').select('*').eq('data', data).order('criado_em')

  const nomeVendedor = (id: string | null) => {
    if (!id) return 'Todos os vendedores'
    return vendedores?.find((v) => v.id === id)?.nome ?? '—'
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Rotina Diária</h1>

      <form className="flex gap-2 items-end" method="get">
        <div className="space-y-1">
          <Label htmlFor="data">Data</Label>
          <Input id="data" name="data" type="date" defaultValue={data} className="bg-slate-800 border-slate-700" />
        </div>
        <Button type="submit" variant="outline">Selecionar</Button>
      </form>

      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle className="text-base">Nova Tarefa</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={criarTarefa} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <input type="hidden" name="data" value={data} />
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="descricao">O que deve ser feito</Label>
              <Input id="descricao" name="descricao" required className="bg-slate-800 border-slate-700" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="vendedor_id">Para</Label>
              <select id="vendedor_id" name="vendedor_id" className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm">
                <option value="todos">Todos os vendedores</option>
                {vendedores?.map((v) => (
                  <option key={v.id} value={v.id}>{v.nome}</option>
                ))}
              </select>
            </div>
            <Button type="submit" className="bg-zinc-100 text-zinc-950 hover:bg-white font-medium">Adicionar</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle className="text-base">Tarefas de {data.split('-').reverse().join('/')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Para</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tarefas?.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{t.descricao}</TableCell>
                  <TableCell>{nomeVendedor(t.vendedor_id)}</TableCell>
                  <TableCell>
                    <Badge variant={t.concluida ? 'default' : 'secondary'}>
                      {t.concluida ? 'Concluída' : 'Pendente'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <form action={alternarConclusaoTarefa.bind(null, t.id, !t.concluida)} className="inline">
                      <Button type="submit" size="sm" variant="outline">
                        {t.concluida ? 'Reabrir' : 'Concluir'}
                      </Button>
                    </form>
                    <form action={excluirTarefa.bind(null, t.id)} className="inline">
                      <Button type="submit" size="sm" variant="destructive">Excluir</Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
              {(!tarefas || tarefas.length === 0) && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-slate-400">Nenhuma tarefa para este dia.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
