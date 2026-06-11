import { createClient } from '@/lib/supabase/server'
import { salvarMetaMensal, gerarDistribuicaoAutomatica, ajustarDiaSituacao, ajustarCotaDia, buscarSugestaoMeta, salvarPercentuaisVendedores, gerarDistribuicaoVendedores } from './actions'
import { formatBRL } from '@/lib/calculos'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export default async function MetasPage({ searchParams }: { searchParams: Promise<{ ano?: string; mes?: string }> }) {
  const sp = await searchParams
  const hoje = new Date()
  const ano = Number(sp.ano ?? hoje.getFullYear())
  const mes = Number(sp.mes ?? hoje.getMonth() + 1)

  const supabase = await createClient()
  const { data: meta } = await supabase
    .from('metas_mensais')
    .select('*')
    .eq('ano', ano)
    .eq('mes', mes)
    .single()

  const inicioMes = `${ano}-${String(mes).padStart(2, '0')}-01`
  const ultimoDia = new Date(ano, mes, 0).getDate()
  const fimMes = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`
  const { data: distribuicao } = await supabase
    .from('distribuicao_diaria')
    .select('*')
    .is('vendedor_id', null)
    .gte('data', inicioMes)
    .lte('data', fimMes)
    .order('data')

  const sugestao = !meta ? await buscarSugestaoMeta(ano, mes) : null

  const { data: vendedores } = await supabase
    .from('profiles')
    .select('*')
    .eq('perfil', 'vendedor')
    .eq('ativo', true)
    .order('nome')

  const { data: percentuais } = await supabase
    .from('metas_vendedor_percentual')
    .select('*')
    .eq('ano', ano)
    .eq('mes', mes)

  const pctMap = new Map((percentuais ?? []).map((p) => [p.vendedor_id, Number(p.percentual)]))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Configuração de Metas — {MESES[mes - 1]}/{ano}</h1>

      <form className="flex gap-2 items-end" method="get">
        <div className="space-y-1">
          <Label htmlFor="ano">Ano</Label>
          <Input id="ano" name="ano" type="number" defaultValue={ano} className="bg-slate-800 border-slate-700 w-24" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="mes">Mês</Label>
          <Input id="mes" name="mes" type="number" min={1} max={12} defaultValue={mes} className="bg-slate-800 border-slate-700 w-20" />
        </div>
        <Button type="submit" variant="outline">Ver</Button>
      </form>

      {sugestao && (
        <Card className="border-indigo-800 bg-indigo-950/40">
          <CardHeader>
            <CardTitle className="text-base">Sugestão de Meta (baseada nos últimos 3 anos)</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-slate-400">Conservadora</p>
              <p className="text-lg font-bold">R$ {formatBRL(sugestao.sugestao.conservadora)}</p>
            </div>
            <div>
              <p className="text-slate-400">Moderada (+10%)</p>
              <p className="text-lg font-bold">R$ {formatBRL(sugestao.sugestao.moderada)}</p>
            </div>
            <div>
              <p className="text-slate-400">Agressiva (+15%)</p>
              <p className="text-lg font-bold">R$ {formatBRL(sugestao.sugestao.agressiva)}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle className="text-base">Passo 1 — Meta Mensal da Loja</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={salvarMetaMensal} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
            <input type="hidden" name="ano" value={ano} />
            <input type="hidden" name="mes" value={mes} />
            <div className="space-y-1">
              <Label htmlFor="meta_valor">Meta Valor (R$)</Label>
              <Input id="meta_valor" name="meta_valor" type="number" step="0.01" defaultValue={meta?.meta_valor ?? sugestao?.sugestao.moderada ?? 0} className="bg-slate-800 border-slate-700" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="meta_atendimentos">Meta Atendimentos</Label>
              <Input id="meta_atendimentos" name="meta_atendimentos" type="number" defaultValue={meta?.meta_atendimentos ?? 0} className="bg-slate-800 border-slate-700" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="meta_pecas">Meta Peças</Label>
              <Input id="meta_pecas" name="meta_pecas" type="number" defaultValue={meta?.meta_pecas ?? 0} className="bg-slate-800 border-slate-700" />
            </div>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500">Salvar Meta</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle className="text-base">Passo 2 — Distribuição Diária</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={gerarDistribuicaoAutomatica}>
            <input type="hidden" name="ano" value={ano} />
            <input type="hidden" name="mes" value={mes} />
            <Button type="submit" variant="outline" disabled={!meta}>
              Gerar Distribuição Automática (pesos por dia da semana)
            </Button>
          </form>

          {distribuicao && distribuicao.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Cota Valor</TableHead>
                  <TableHead>Atend.</TableHead>
                  <TableHead>Peças</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {distribuicao.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{d.data.split('-').reverse().join('/')}</TableCell>
                    <TableCell>
                      <form action={ajustarCotaDia.bind(null, d.id)} className="flex gap-1">
                        <Input name="cota_valor" type="number" step="1" defaultValue={Math.round(Number(d.cota_valor))} className="bg-slate-800 border-slate-700 w-24 h-8" />
                        <Input name="cota_atendimentos" type="number" defaultValue={d.cota_atendimentos} className="hidden" />
                        <Input name="cota_pecas" type="number" defaultValue={d.cota_pecas} className="hidden" />
                        <Button type="submit" size="sm" variant="outline">Salvar</Button>
                      </form>
                    </TableCell>
                    <TableCell>{d.cota_atendimentos}</TableCell>
                    <TableCell>{d.cota_pecas}</TableCell>
                    <TableCell>{d.situacao}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <form action={ajustarDiaSituacao.bind(null, d.id, 'feriado')} className="inline">
                        <Button type="submit" size="sm" variant="outline">Feriado</Button>
                      </form>
                      <form action={ajustarDiaSituacao.bind(null, d.id, 'fechado')} className="inline">
                        <Button type="submit" size="sm" variant="outline">Fechado</Button>
                      </form>
                      <form action={ajustarDiaSituacao.bind(null, d.id, 'normal')} className="inline">
                        <Button type="submit" size="sm" variant="outline">Normal</Button>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle className="text-base">Passo 3 — Divisão da Meta por Vendedor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={salvarPercentuaisVendedores.bind(null, ano, mes)} className="space-y-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>%</TableHead>
                  <TableHead>Valor (R$)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendedores?.map((v) => {
                  const pct = pctMap.get(v.id) ?? 0
                  const valorVendedor = (Number(meta?.meta_valor ?? 0) * pct) / 100
                  return (
                    <TableRow key={v.id}>
                      <TableCell>{v.nome}</TableCell>
                      <TableCell>
                        <Input
                          name={`pct_${v.id}`}
                          type="number"
                          step="0.01"
                          min={0}
                          max={100}
                          defaultValue={pct}
                          className="bg-slate-800 border-slate-700 w-24 h-8"
                        />
                      </TableCell>
                      <TableCell>R$ {formatBRL(valorVendedor)}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            <Button type="submit" variant="outline">Salvar Percentuais</Button>
          </form>

          <form action={gerarDistribuicaoVendedores}>
            <input type="hidden" name="ano" value={ano} />
            <input type="hidden" name="mes" value={mes} />
            <Button type="submit" variant="outline" disabled={!meta || !vendedores || vendedores.length === 0}>
              Gerar Distribuição por Vendedor (a partir dos percentuais)
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
