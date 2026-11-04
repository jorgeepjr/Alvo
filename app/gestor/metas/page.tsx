import { createClient } from '@/lib/supabase/server'
import { salvarMetaMensal, gerarDistribuicaoAutomatica, ajustarDiaSituacao, ajustarCotaDia, liberarDia, buscarSugestaoMeta, salvarPercentuaisVendedores, gerarDistribuicaoVendedores, aplicarSugestaoTendencia } from './actions'
import { formatBRL } from '@/lib/calculos'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { GerarMetasFuturas } from './gerar-metas-futuras'

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

  // Vendido por dia (todos os lançamentos do mês) para comparar com a cota e
  // ver os dias que ficaram sem lançamento.
  const { data: lancMes } = await supabase
    .from('lancamentos')
    .select('data, valor')
    .gte('data', inicioMes)
    .lte('data', fimMes)
  const vendidoPorDia = new Map<string, number>()
  for (const l of lancMes ?? []) vendidoPorDia.set(l.data, (vendidoPorDia.get(l.data) ?? 0) + Number(l.valor))
  const hojeStr = new Date().toISOString().slice(0, 10)

  // Referência = dias úteis JÁ FINALIZADOS (antes de hoje). O dia atual não é
  // cobrado, pois o lançamento é feito no dia seguinte. Dias finalizados sem
  // lançamento contam como "sem lançamento" (cobrança).
  const diasRef = (distribuicao ?? []).filter((d) => d.situacao === 'normal' && d.data < hojeStr)
  const refData =
    diasRef.length > 0 ? diasRef.map((d) => d.data).reduce((a, b) => (a > b ? a : b)) : hojeStr
  const diasSemLancar = diasRef.filter((d) => !vendidoPorDia.has(d.data)).length
  const somaVendido = Array.from(vendidoPorDia.values()).reduce((a, v) => a + v, 0)
  // Diferença acumulada até o último dia lançado (vendido − cota).
  const somaDiferencaAteHoje = diasRef.reduce(
    (a, d) => a + ((vendidoPorDia.get(d.data) ?? 0) - Number(d.cota_valor)),
    0
  )
  const cotaAteHoje = diasRef.reduce((a, d) => a + Number(d.cota_valor), 0)

  // Somatórios para conferência da distribuição vs. meta
  const somaCotaValor = (distribuicao ?? []).reduce((acc, d) => acc + Number(d.cota_valor), 0)
  const somaCotaAtend = (distribuicao ?? []).reduce((acc, d) => acc + Number(d.cota_atendimentos), 0)
  const somaCotaPecas = (distribuicao ?? []).reduce((acc, d) => acc + Number(d.cota_pecas), 0)

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
        <Card className="border-zinc-700 bg-zinc-900/40">
          <CardHeader>
            <CardTitle className="text-base">Sugestão de Meta (baseada nos últimos 3 anos)</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-sm">
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
            {sugestao.sugestao.tendencia !== null && (
              <div>
                <p className="text-slate-400">Tendência (mesmo mês do ano passado × crescimento dos últimos 3 meses)</p>
                <p className="text-lg font-bold">R$ {formatBRL(sugestao.sugestao.tendencia)}</p>
                {sugestao.sugestao.tendenciaAtendimentos !== null && (
                  <p className="text-xs text-slate-400 mt-1">
                    Atendimentos: {Math.round(sugestao.sugestao.tendenciaAtendimentos)}
                  </p>
                )}
                {sugestao.sugestao.tendenciaPecas !== null && (
                  <p className="text-xs text-slate-400">
                    Peças: {Math.round(sugestao.sugestao.tendenciaPecas)}
                  </p>
                )}
              </div>
            )}
          </CardContent>
          {sugestao.sugestao.tendencia !== null && (
            <CardContent className="pt-0">
              <form action={aplicarSugestaoTendencia}>
                <input type="hidden" name="ano" value={ano} />
                <input type="hidden" name="mes" value={mes} />
                <input type="hidden" name="tendencia_valor" value={sugestao.sugestao.tendencia} />
                <input type="hidden" name="tendencia_atendimentos" value={sugestao.sugestao.tendenciaAtendimentos ?? 0} />
                <input type="hidden" name="tendencia_pecas" value={sugestao.sugestao.tendenciaPecas ?? 0} />
                <Button type="submit" variant="outline">Usar Projeção de Tendência (valor + atendimentos + peças)</Button>
              </form>
            </CardContent>
          )}
        </Card>
      )}

      <Card className="border-zinc-700 bg-slate-900">
        <CardHeader>
          <CardTitle className="text-base">Cotas Futuras (automático)</CardTitle>
          <p className="text-xs text-slate-400 mt-1">
            Calcula as metas dos próximos 12 meses a partir do histórico (mesmo mês do ano anterior ×
            crescimento dos últimos 3 meses vs. os mesmos meses do ano anterior). Não altera metas já definidas.
          </p>
        </CardHeader>
        <CardContent>
          <GerarMetasFuturas ano={ano} mes={mes} />
        </CardContent>
      </Card>

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
              <Input id="meta_valor" name="meta_valor" type="number" step="1" min="0" defaultValue={meta?.meta_valor != null ? Math.round(Number(meta.meta_valor)) : sugestao ? Math.round(sugestao.sugestao.moderada) : 0} className="bg-slate-800 border-slate-700" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="meta_atendimentos">Meta Atendimentos</Label>
              <Input id="meta_atendimentos" name="meta_atendimentos" type="number" step="1" min="0" defaultValue={meta?.meta_atendimentos ?? 0} className="bg-slate-800 border-slate-700" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="meta_pecas">Meta Peças</Label>
              <Input id="meta_pecas" name="meta_pecas" type="number" step="1" min="0" defaultValue={meta?.meta_pecas ?? 0} className="bg-slate-800 border-slate-700" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="super_meta_valor">🏆 Super Meta (R$)</Label>
              <Input id="super_meta_valor" name="super_meta_valor" type="number" step="1" min="0" placeholder="ex: 90000" defaultValue={meta?.super_meta_valor ? Math.round(Number(meta.super_meta_valor)) : ''} className="bg-slate-800 border-slate-700" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="super_meta_premio">Prêmio da Super Meta</Label>
              <Input id="super_meta_premio" name="super_meta_premio" type="text" placeholder="ex: Uma peça de roupa para cada vendedor" defaultValue={meta?.super_meta_premio ?? ''} className="bg-slate-800 border-slate-700" />
            </div>
            <Button type="submit" className="bg-zinc-100 text-zinc-950 hover:bg-white font-medium">Salvar Meta</Button>
          </form>
          <p className="text-xs text-slate-400 mt-3">
            🏆 <b>Super Meta</b> (opcional): se a loja passar desse valor no mês, o prêmio é liberado. Aparece com barra de progresso no Dashboard e no painel dos vendedores. Deixe em branco (ou 0) para não usar.
          </p>
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

          <p className="text-xs text-slate-400">
            Ao <b>Salvar</b> a cota de um dia, ele fica <b>📌 fixado</b>. O que falta para a meta é dividido só entre os dias
            ainda não salvos (valores redondos de R$ 100; só o último dia livre leva a diferença). Assim a soma sempre bate com a Meta Valor.
          </p>

          {diasRef.length > 0 && (() => {
            const vendidoAcum = cotaAteHoje + somaDiferencaAteHoje
            // Tolerância de 1% da cota do período para considerar "batendo a meta".
            const tol = Math.max(cotaAteHoje * 0.01, 1)
            const status =
              somaDiferencaAteHoje > tol ? 'acima' : somaDiferencaAteHoje < -tol ? 'abaixo' : 'batendo'
            const cor =
              status === 'acima'
                ? 'border-green-800 bg-green-950/20 text-green-300'
                : status === 'abaixo'
                ? 'border-red-800 bg-red-950/20 text-red-300'
                : 'border-yellow-800 bg-yellow-950/20 text-yellow-300'
            const rotulo = status === 'acima' ? '✅ Acima da meta' : status === 'abaixo' ? '⚠️ Abaixo da meta' : '🎯 Batendo a meta'
            return (
              <div className={`rounded-md border px-3 py-2 text-sm ${cor}`}>
                {rotulo} até {refData.split('-').reverse().join('/')}:{' '}
                vendido <b>R$ {formatBRL(vendidoAcum)}</b> vs meta do período <b>R$ {formatBRL(cotaAteHoje)}</b>
                {' '}({somaDiferencaAteHoje >= 0 ? '+' : '−'}R$ {formatBRL(Math.abs(somaDiferencaAteHoje))})
              </div>
            )
          })()}

          {diasSemLancar > 0 && (
            <p className="text-sm text-red-400">
              ⚠️ {diasSemLancar} dia(s) útil(eis) passado(s) sem lançamento de venda (destacados em vermelho abaixo).
            </p>
          )}

          {distribuicao && distribuicao.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Cota Valor</TableHead>
                  <TableHead>Vendido</TableHead>
                  <TableHead>Diferença</TableHead>
                  <TableHead>Atend.</TableHead>
                  <TableHead>Peças</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {distribuicao.map((d) => {
                  const vendido = vendidoPorDia.get(d.data)
                  const semLancar = d.situacao === 'normal' && d.data < hojeStr && vendido === undefined
                  return (
                  <TableRow key={d.id} className={semLancar ? 'bg-red-950/30' : ''}>
                    <TableCell>{d.data.split('-').reverse().join('/')}</TableCell>
                    <TableCell>
                      <form action={ajustarCotaDia.bind(null, d.id, ano, mes)} className="flex gap-1">
                        <Input name="cota_valor" type="number" step="1" min="0" defaultValue={Math.round(Number(d.cota_valor))} className="bg-slate-800 border-slate-700 w-24 h-8" />
                        <Input name="cota_atendimentos" type="number" defaultValue={d.cota_atendimentos} className="hidden" />
                        <Input name="cota_pecas" type="number" defaultValue={d.cota_pecas} className="hidden" />
                        <Button type="submit" size="sm" variant="outline">Salvar</Button>
                      </form>
                      {d.cota_fixada && d.situacao === 'normal' && (
                        <form action={liberarDia.bind(null, d.id, ano, mes)} className="mt-1 flex items-center gap-1 text-xs text-zinc-400">
                          <span title="Dia salvo: o recálculo automático não mexe nele">📌 fixado</span>
                          <button type="submit" className="underline hover:text-zinc-200">soltar</button>
                        </form>
                      )}
                    </TableCell>
                    <TableCell>
                      {vendido !== undefined ? (
                        <span
                          className={
                            Number(d.cota_valor) > 0
                              ? vendido >= Number(d.cota_valor)
                                ? 'text-green-400 font-medium'
                                : 'text-red-400 font-medium'
                              : ''
                          }
                        >
                          R$ {formatBRL(vendido)}
                          {Number(d.cota_valor) > 0 && (vendido >= Number(d.cota_valor) ? ' ▲' : ' ▼')}
                        </span>
                      ) : semLancar ? (
                        <span className="text-red-400 font-medium">Sem lançamento</span>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const cota = Number(d.cota_valor)
                        // Só faz sentido em dias úteis passados (ou com venda lançada).
                        if (d.situacao !== 'normal' || d.data >= hojeStr) return '—'
                        const dif = (vendido ?? 0) - cota
                        return (
                          <span className={dif >= 0 ? 'text-green-400 font-medium' : 'text-red-400 font-medium'}>
                            {dif >= 0 ? '+' : '−'}R$ {formatBRL(Math.abs(dif))}
                          </span>
                        )
                      })()}
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
                  )
                })}
                <TableRow className="border-t-2 border-slate-700 font-semibold">
                  <TableCell className="text-zinc-300">Total distribuído</TableCell>
                  <TableCell className={meta && Math.abs(somaCotaValor - Number(meta.meta_valor)) < 1 ? 'text-green-400' : 'text-yellow-400'}>
                    R$ {formatBRL(somaCotaValor)} {meta && (Math.abs(somaCotaValor - Number(meta.meta_valor)) < 1 ? '✓' : '⚠')}
                    {meta && Math.abs(somaCotaValor - Number(meta.meta_valor)) >= 1 && (
                      <div className="text-xs font-normal">
                        {somaCotaValor < Number(meta.meta_valor) ? 'Falta' : 'Passou'} R$ {formatBRL(Math.abs(Number(meta.meta_valor) - somaCotaValor))} da meta. Solte um dia (📌) para o sistema ajustar.
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-zinc-300">R$ {formatBRL(somaVendido)}</TableCell>
                  <TableCell className={somaDiferencaAteHoje >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {somaDiferencaAteHoje >= 0 ? '+' : '−'}R$ {formatBRL(Math.abs(somaDiferencaAteHoje))}
                  </TableCell>
                  <TableCell className={meta && somaCotaAtend === Number(meta.meta_atendimentos) ? 'text-green-400' : 'text-yellow-400'}>
                    {somaCotaAtend} {meta && (somaCotaAtend === Number(meta.meta_atendimentos) ? '✓' : '⚠')}
                  </TableCell>
                  <TableCell className={meta && somaCotaPecas === Number(meta.meta_pecas) ? 'text-green-400' : 'text-yellow-400'}>
                    {somaCotaPecas} {meta && (somaCotaPecas === Number(meta.meta_pecas) ? '✓' : '⚠')}
                  </TableCell>
                  <TableCell colSpan={2} className="text-xs text-slate-400">
                    {meta && (
                      <>Meta: R$ {formatBRL(Number(meta.meta_valor))} · {meta.meta_atendimentos} atend · {meta.meta_pecas} peças</>
                    )}
                  </TableCell>
                </TableRow>
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
