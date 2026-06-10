import { createClient } from '@/lib/supabase/server'
import { criarVendedor, alternarAtivo, editarVendedor } from './actions'
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

  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const emails: Record<string, string> = {}
  for (const v of vendedores ?? []) {
    const { data } = await admin.auth.admin.getUserById(v.id)
    if (data?.user?.email) emails[v.id] = data.user.email
  }

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
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500">Cadastrar</Button>
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
                  <TableCell colSpan={3} className="p-0">
                    <details className="group">
                      <summary className="flex items-center px-4 py-2 cursor-pointer list-none">
                        <span className="flex-1">
                          <Link href={`/gestor/vendedores/${v.id}`} className="text-indigo-400 hover:underline" onClick={(e) => e.stopPropagation()}>
                            {v.nome}
                          </Link>
                        </span>
                        <span className="flex-1">
                          <Badge variant={v.ativo ? 'default' : 'secondary'}>
                            {v.ativo ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </span>
                        <span className="flex items-center gap-2">
                          <form action={alternarAtivo.bind(null, v.id, !v.ativo)} onClick={(e) => e.stopPropagation()}>
                            <Button type="submit" variant="outline" size="sm">
                              {v.ativo ? 'Inativar' : 'Ativar'}
                            </Button>
                          </form>
                          <Button type="button" variant="outline" size="sm">Editar</Button>
                        </span>
                      </summary>
                      <div className="px-4 pb-4">
                        <form action={editarVendedor.bind(null, v.id)} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                          <div className="space-y-1">
                            <Label htmlFor={`nome-${v.id}`}>Nome</Label>
                            <Input id={`nome-${v.id}`} name="nome" defaultValue={v.nome} required className="bg-slate-800 border-slate-700" />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`email-${v.id}`}>E-mail</Label>
                            <Input id={`email-${v.id}`} name="email" type="email" defaultValue={emails[v.id] ?? ''} className="bg-slate-800 border-slate-700" />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`senha-${v.id}`}>Nova senha (opcional)</Label>
                            <Input id={`senha-${v.id}`} name="senha" type="password" placeholder="deixe em branco para manter" className="bg-slate-800 border-slate-700" />
                          </div>
                          <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500">Salvar</Button>
                        </form>
                      </div>
                    </details>
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
