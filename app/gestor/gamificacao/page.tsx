import { createClient } from '@/lib/supabase/server'
import { calcularGamificacao, regrasTexto, TIPOS_DESAFIO } from '@/lib/gamificacao'
import { formatBRL } from '@/lib/calculos'
import { salvarNiveis, salvarConfigPontos, criarDesafio, excluirDesafio } from './actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

export default async function GamificacaoGestorPage() {
  const supabase = await createClient()
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = hoje.getMonth() + 1
  const hojeStr = hoje.toISOString().slice(0, 10)

  const { vendedores, niveis, config, desafios } = await calcularGamificacao(supabase, ano, mes)
  const tipoLabel = (t: string) => TIPOS_DESAFIO.find((x) => x.valor === t)?.label ?? t

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gamificação — {MESES[mes - 1]}/{ano}</h1>
        <p className="text-sm text-zinc-400">Pontos, níveis, medalhas e desafios da equipe.</p>
      </div>

      {/* Ranking */}
      <Card className="border-slate-800 bg-slate-900">
        <CardHeader><CardTitle className="text-base">🏆 Ranking de Pontos</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {vendedores.length === 0 && <p className="text-sm text-slate-400">Nenhum vendedor ativo.</p>}
          {vendedores.map((v, i) => (
            <div key={v.id} className="rounded-md border border-slate-800 bg-slate-950/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-lg font-bold w-6 text-center">{i + 1}º</span>
                  <div className="min-w-0">
                    <p className="font-medium">
                      {v.nome}{' '}
                      {v.nivel && <span className="text-xs" style={{ color: v.nivel.cor }}>{v.nivel.icone} {v.nivel.nome}</span>}
                    </p>
                    <p className="text-xs text-slate-400">
                      Vendido R$ {formatBRL(v.valorMes)} · Conversão {v.conversao.toFixed(0)}% · Ticket R$ {formatBRL(v.ticket)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold">{v.pontos}</p>
                  <p className="text-xs text-slate-500">pts</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {v.medalhas.filter((m) => m.conquistada).map((m) => (
                  <span key={m.slug} title={m.desc} className="rounded bg-white/5 px-2 py-0.5 text-xs">{m.icone} {m.nome}</span>
                ))}
              </div>
              {v.proximoNivel && (
                <p className="text-xs text-slate-500 mt-2">
                  Faltam <b>{v.faltaProximo}</b> pts para {v.proximoNivel.icone} {v.proximoNivel.nome}
                </p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Desafios */}
      <Card className="border-slate-800 bg-slate-900">
        <CardHeader><CardTitle className="text-base">🎮 Desafios</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <form action={criarDesafio} className="grid grid-cols-1 sm:grid-cols-6 gap-3 items-end">
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="titulo">Título</Label>
              <Input id="titulo" name="titulo" required placeholder="Ex: Semana turbo" className="bg-slate-800 border-slate-700" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tipo">Tipo</Label>
              <select id="tipo" name="tipo" className="w-full rounded-md bg-slate-800 border border-slate-700 px-2 py-2 text-sm">
                {TIPOS_DESAFIO.map((t) => <option key={t.valor} value={t.valor}>{t.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="alvo">Alvo</Label>
              <Input id="alvo" name="alvo" type="number" step="any" placeholder="ex: 5000" className="bg-slate-800 border-slate-700" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pontos">Pontos</Label>
              <Input id="pontos" name="pontos" type="number" placeholder="ex: 100" className="bg-slate-800 border-slate-700" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="data_inicio">Início</Label>
              <Input id="data_inicio" name="data_inicio" type="date" defaultValue={hojeStr} className="bg-slate-800 border-slate-700" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="data_fim">Fim</Label>
              <Input id="data_fim" name="data_fim" type="date" defaultValue={hojeStr} className="bg-slate-800 border-slate-700" />
            </div>
            <div className="space-y-1 sm:col-span-4">
              <Label htmlFor="descricao">Descrição (opcional)</Label>
              <Input id="descricao" name="descricao" className="bg-slate-800 border-slate-700" />
            </div>
            <Button type="submit" className="bg-zinc-100 text-zinc-950 hover:bg-white font-medium">Criar Desafio</Button>
          </form>

          {desafios.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhum desafio cadastrado.</p>
          ) : (
            <div className="space-y-2">
              {desafios.map((d) => (
                <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-800 bg-slate-950/40 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{d.titulo} <span className="text-xs text-slate-400">(+{d.pontos} pts)</span></p>
                    <p className="text-xs text-slate-400">
                      {tipoLabel(d.tipo)} · alvo {d.tipo === 'valor' ? `R$ ${formatBRL(Number(d.alvo))}` : d.alvo} ·{' '}
                      {d.data_inicio.split('-').reverse().join('/')} a {d.data_fim.split('-').reverse().join('/')}
                    </p>
                  </div>
                  <form action={excluirDesafio.bind(null, d.id)}>
                    <Button type="submit" size="sm" variant="destructive">Excluir</Button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Níveis */}
      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle className="text-base">Níveis e Benefícios</CardTitle>
          <p className="text-xs text-slate-400 mt-1">Faixas de pontos e o benefício de cada nível (ex: folga, vale, bônus).</p>
        </CardHeader>
        <CardContent>
          <form action={salvarNiveis} className="space-y-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nível</TableHead>
                  <TableHead>Pts mín.</TableHead>
                  <TableHead>Pts máx.</TableHead>
                  <TableHead>Benefício</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {niveis.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell><Input name={`nome_${n.id}`} defaultValue={n.nome} className="bg-slate-800 border-slate-700 w-28 h-8" /></TableCell>
                    <TableCell><Input name={`pts_min_${n.id}`} type="number" defaultValue={n.pts_min} className="bg-slate-800 border-slate-700 w-24 h-8" /></TableCell>
                    <TableCell><Input name={`pts_max_${n.id}`} type="number" defaultValue={n.pts_max ?? ''} placeholder="∞" className="bg-slate-800 border-slate-700 w-24 h-8" /></TableCell>
                    <TableCell><Input name={`beneficio_${n.id}`} defaultValue={n.beneficio} placeholder="ex: Folga extra no mês" className="bg-slate-800 border-slate-700" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button type="submit" className="bg-zinc-100 text-zinc-950 hover:bg-white font-medium">Salvar Níveis</Button>
          </form>
        </CardContent>
      </Card>

      {/* Configuração de pontos */}
      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle className="text-base">Regras de Pontuação (configurável)</CardTitle>
          <p className="text-xs text-slate-400 mt-1">Ajuste quantos pontos cada ação vale.</p>
        </CardHeader>
        <CardContent>
          <form action={salvarConfigPontos} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1"><Label>Meta 100% (pts)</Label><Input name="pts_meta" type="number" defaultValue={config.pts_meta} className="bg-slate-800 border-slate-700" /></div>
            <div className="space-y-1"><Label>Por dia batido</Label><Input name="pts_dia" type="number" defaultValue={config.pts_dia} className="bg-slate-800 border-slate-700" /></div>
            <div className="space-y-1"><Label>Por item de rotina</Label><Input name="pts_rotina" type="number" defaultValue={config.pts_rotina} className="bg-slate-800 border-slate-700" /></div>
            <div className="space-y-1"><Label>Por dia de sequência</Label><Input name="pts_streak" type="number" defaultValue={config.pts_streak} className="bg-slate-800 border-slate-700" /></div>
            <div className="space-y-1"><Label>Conversão alta ≥ (%)</Label><Input name="conv_alta_min" type="number" defaultValue={config.conv_alta_min} className="bg-slate-800 border-slate-700" /></div>
            <div className="space-y-1"><Label>Pts conversão alta</Label><Input name="pts_conv_alta" type="number" defaultValue={config.pts_conv_alta} className="bg-slate-800 border-slate-700" /></div>
            <div className="space-y-1"><Label>Conversão média ≥ (%)</Label><Input name="conv_media_min" type="number" defaultValue={config.conv_media_min} className="bg-slate-800 border-slate-700" /></div>
            <div className="space-y-1"><Label>Pts conversão média</Label><Input name="pts_conv_media" type="number" defaultValue={config.pts_conv_media} className="bg-slate-800 border-slate-700" /></div>
            <div className="space-y-1"><Label>Conversão baixa ≥ (%)</Label><Input name="conv_baixa_min" type="number" defaultValue={config.conv_baixa_min} className="bg-slate-800 border-slate-700" /></div>
            <div className="space-y-1"><Label>Pts conversão baixa</Label><Input name="pts_conv_baixa" type="number" defaultValue={config.pts_conv_baixa} className="bg-slate-800 border-slate-700" /></div>
            <div className="sm:col-span-4">
              <Button type="submit" className="bg-zinc-100 text-zinc-950 hover:bg-white font-medium">Salvar Regras</Button>
            </div>
          </form>
          <ul className="mt-4 space-y-1">
            {regrasTexto(config).map((r, i) => (
              <li key={i} className="text-xs text-slate-400 flex gap-2"><span>•</span><span>{r}</span></li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
