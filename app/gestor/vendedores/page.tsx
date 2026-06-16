import { createClient } from '@/lib/supabase/server'
import { criarVendedor, alternarAtivo } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export default async function VendedoresPage() {
  const supabase = await createClient()
  const { data: vendedores } = await supabase
    .from('profiles')
    .select('*')
    .eq('perfil', 'vendedor')
    .order('nome')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Vendedores</h1>

      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle className="text-base">Novo Vendedor</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={criarVendedor} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div className="space-y-1">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" name="nome" required className="bg-slate-800 border-slate-700" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" required className="bg-slate-800 border-slate-700" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="senha">Senha</Label>
              <Input id="senha" name="senha" type="password" required className="bg-slate-800 border-slate-700" />
            </div>
            <Button type="submit" className="bg-zinc-100 text-zinc-950 hover:bg-white font-medium">Cadastrar</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-900">
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendedores?.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>
                    <Link href={`/gestor/vendedores/${v.id}`} className="text-zinc-300 hover:underline">
                      {v.nome}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={v.ativo ? 'default' : 'secondary'}>
                      {v.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Link href={`/gestor/vendedores/${v.id}`}>
                      <Button type="button" variant="outline" size="sm">Editar</Button>
                    </Link>
                    <form action={alternarAtivo.bind(null, v.id, !v.ativo)} className="inline">
                      <Button type="submit" variant="outline" size="sm">
                        {v.ativo ? 'Inativar' : 'Ativar'}
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
