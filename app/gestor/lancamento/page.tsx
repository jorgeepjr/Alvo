import { createClient } from '@/lib/supabase/server'
import { salvarLancamentoGestor, fecharDia } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default async function LancamentoGestorPage({ searchParams }: { searchParams: Promise<{ data?: string }> }) {
  const sp = await searchParams
  const data = sp.data ?? new Date().toISOString().slice(0, 10)

  const supabase = await createClient()
  const { data: vendedores } = await supabase.from('profiles').select('*').eq('perfil', 'vendedor').eq('ativo', true).order('nome')
  const { data: lancamentos } = await supabase.from('lancamentos').select('*').eq('data', data)

  const lancamentoLoja = lancamentos?.find((l) => l.vendedor_id === null)

  // Soma de todos os vendedores (exclui a "Venda da Loja") — base da cota
  const lancamentosVendedores = lancamentos?.filter((l) => l.vendedor_id !== null) ?? []
  const totalAtendimentos = lancamentosVendedores.reduce((acc, l) => acc + (l.atendimentos ?? 0), 0)
  const totalPecas = lancamentosVendedores.reduce((acc, l) => acc + (l.pecas ?? 0), 0)
  const totalValor = lancamentosVendedores.reduce((acc, l) => acc + Number(l.valor ?? 0), 0)

  // Total Geral = vendedores + Venda da Loja
  const totalGeralAtendimentos = totalAtendimentos + (lancamentoLoja?.atendimentos ?? 0)
  const totalGeralPecas = totalPecas + (lancamentoLoja?.pecas ?? 0)
  const totalGeralValor = totalValor + Number(lancamentoLoja?.valor ?? 0)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Lançamento de Vendas</h1>

      <div className="flex gap-2 items-end">
        <form className="flex gap-2 items-end" method="get">
          <div className="space-y-1">
            <Label htmlFor="data">Data</Label>
            <Input id="data" name="data" type="date" defaultValue={data} className="bg-slate-800 border-slate-700" />
          </div>
          <Button type="submit" variant="outline">Selecionar</Button>
        </form>
        <form action={fecharDia.bind(null, data)}>
          <Button type="submit" variant="destructive">Fechar Dia</Button>
        </form>
      </div>

      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle className="text-base">Lançar / Editar Venda</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={salvarLancamentoGestor} className="grid grid-cols-1 sm:grid-cols-6 gap-3 items-end">
            <input type="hidden" name="data" value={data} />
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="vendedor_id">Vendedor</Label>
              <select id="vendedor_id" name="vendedor_id" className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm">
                <option value="loja">Venda da Loja</option>
                {vendedores?.map((v) => (
                  <option key={v.id} value={v.id}>{v.nome}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="atendimentos">Atendimentos</Label>
              <Input id="atendimentos" name="atendimentos" type="number" defaultValue={0} className="bg-slate-800 border-slate-700" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pecas">Peças</Label>
              <Input id="pecas" name="pecas" type="number" defaultValue={0} className="bg-slate-800 border-slate-700" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="valor">Valor (R$)</Label>
              <Input id="valor" name="valor" type="number" step="0.01" defaultValue={0} className="bg-slate-800 border-slate-700" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="situacao_vendedor">Situação</Label>
              <select id="situacao_vendedor" name="situacao_vendedor" className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm">
                <option value="normal">Normal</option>
                <option value="atestado">Atestado</option>
                <option value="nao_trabalhou">Não trabalhou</option>
              </select>
            </div>
            <div className="space-y-1 sm:col-span-5">
              <Label htmlFor="observacao">Observação</Label>
              <Input id="observacao" name="observacao" className="bg-slate-800 border-slate-700" />
            </div>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500">Salvar</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle className="text-base">Lançamentos do Dia ({data.split('-').reverse().join('/')})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quem</TableHead>
                <TableHead>Atend.</TableHead>
                <TableHead>Peças</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Situação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lancamentoLoja && (
                <TableRow>
                  <TableCell>Venda da Loja</TableCell>
                  <TableCell>{lancamentoLoja.atendimentos}</TableCell>
                  <TableCell>{lancamentoLoja.pecas}</TableCell>
                  <TableCell>R$ {Number(lancamentoLoja.valor).toFixed(2)}</TableCell>
                  <TableCell>{lancamentoLoja.situacao_vendedor}</TableCell>
                </TableRow>
              )}
              {vendedores?.map((v) => {
                const l = lancamentos?.find((x) => x.vendedor_id === v.id)
                return (
                  <TableRow key={v.id}>
                    <TableCell>{v.nome}</TableCell>
                    <TableCell>{l?.atendimentos ?? '-'}</TableCell>
                    <TableCell>{l?.pecas ?? '-'}</TableCell>
                    <TableCell>{l ? `R$ ${Number(l.valor).toFixed(2)}` : '-'}</TableCell>
                    <TableCell>{l?.situacao_vendedor ?? '-'}</TableCell>
                  </TableRow>
                )
              })}
              <TableRow className="border-t-2 border-slate-700 font-semibold">
                <TableCell className="text-slate-300">Total dos Vendedores (cota)</TableCell>
                <TableCell className="text-slate-300">{totalAtendimentos}</TableCell>
                <TableCell className="text-slate-300">{totalPecas}</TableCell>
                <TableCell className="text-slate-300">R$ {totalValor.toFixed(2)}</TableCell>
                <TableCell>-</TableCell>
              </TableRow>
              <TableRow className="font-bold">
                <TableCell className="text-green-400">Total Geral (vendedores + loja)</TableCell>
                <TableCell className="text-green-400">{totalGeralAtendimentos}</TableCell>
                <TableCell className="text-green-400">{totalGeralPecas}</TableCell>
                <TableCell className="text-green-400">R$ {totalGeralValor.toFixed(2)}</TableCell>
                <TableCell>-</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
