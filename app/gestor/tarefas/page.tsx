import { createClient } from '@/lib/supabase/server'
import { criarTarefa, excluirTarefa, alternarConclusaoTarefa, atribuirBlocoRotina, dividirRotinaAutomatico } from './actions'
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

  // Nomes dos vendedores por posição (0 e 1), para a divisão da rotina.
  const vend0 = vendedores?.[0]?.nome ?? 'Vendedor 1'
  const vend1 = vendedores?.[1]?.nome ?? 'Vendedor 2'

  // Rotação semanal: mostra quem é o "Grupo A" e o "Grupo B" nesta semana
  // (eles trocam toda semana). O mesmo cálculo é usado no painel do vendedor.
  const refSemana = new Date(2024, 0, 1).getTime()
  const semanaParidade = Math.floor((Date.now() - refSemana) / (7 * 86400000)) % 2
  // Grupo A = base 0; nesta semana o dono efetivo de base 0 é este vendedor:
  const grupoAnome = semanaParidade === 0 ? vend0 : vend1
  const grupoBnome = semanaParidade === 0 ? vend1 : vend0

  // Rotina-modelo agrupada por dia da semana e bloco, para o gestor controlar
  // quem faz cada bloco.
  const { data: rotinaModelo } = await supabase
    .from('rotina_modelo')
    .select('*')
    .order('dia_semana')
    .order('ordem')

  const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
  type BlocoRotina = { horario: string; bloco: string; atribuido_a: number | null; itens: string[] }
  const rotinaPorDia = new Map<number, BlocoRotina[]>()
  for (const item of rotinaModelo ?? []) {
    if (!rotinaPorDia.has(item.dia_semana)) rotinaPorDia.set(item.dia_semana, [])
    const blocos = rotinaPorDia.get(item.dia_semana)!
    let bloco = blocos.find((b) => b.horario === item.horario && b.bloco === item.bloco)
    if (!bloco) {
      bloco = { horario: item.horario, bloco: item.bloco, atribuido_a: item.atribuido_a, itens: [] }
      blocos.push(bloco)
    }
    bloco.itens.push(item.descricao)
  }
  const diasComRotina = [...rotinaPorDia.keys()].sort((a, b) => a - b)

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

      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Divisão da Rotina entre os Vendedores</CardTitle>
            <form action={dividirRotinaAutomatico}>
              <Button type="submit" size="sm" className="bg-zinc-100 text-zinc-950 hover:bg-white font-medium">
                ⚡ Dividir automaticamente
              </Button>
            </form>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            &quot;Dividir automaticamente&quot; dá um dono único para cada bloco (equilibrando a carga) e
            mantém vitrine/looks e estratégia digital como &quot;Ambos&quot;. Os papéis trocam toda semana.
          </p>
          <p className="text-xs text-zinc-300 mt-1">
            Esta semana → <span className="font-semibold">Grupo A: {grupoAnome}</span> ·{' '}
            <span className="font-semibold">Grupo B: {grupoBnome}</span> (trocam na próxima semana)
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {diasComRotina.map((dia) => (
            <div key={dia} className="space-y-2">
              <p className="text-sm font-semibold text-zinc-100">{DIAS[dia]}</p>
              <div className="space-y-2">
                {rotinaPorDia.get(dia)!.map((b) => (
                  <div
                    key={`${b.horario}-${b.bloco}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-800 bg-slate-950/40 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm">
                        <span className="text-zinc-400">{b.horario}</span> — <span className="font-medium">{b.bloco}</span>
                        <span className="text-xs text-slate-500"> ({b.itens.length} tarefas)</span>
                      </p>
                    </div>
                    <form action={atribuirBlocoRotina.bind(null, dia, b.horario, b.bloco)} className="flex items-center gap-2">
                      <select
                        name="atribuidoRaw"
                        defaultValue={b.atribuido_a === null ? '' : String(b.atribuido_a)}
                        className="rounded-md bg-slate-800 border border-slate-700 px-2 py-1 text-sm"
                      >
                        <option value="">Ambos</option>
                        <option value="0">Grupo A</option>
                        <option value="1">Grupo B</option>
                      </select>
                      <Button type="submit" size="sm" variant="outline">Salvar</Button>
                    </form>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {diasComRotina.length === 0 && (
            <p className="text-sm text-slate-400">Nenhuma rotina cadastrada ainda.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
