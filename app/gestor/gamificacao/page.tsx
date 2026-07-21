import { createClient } from '@/lib/supabase/server'
import { calcularGamificacao, REGRAS_TEXTO } from '@/lib/gamificacao'
import { formatBRL } from '@/lib/calculos'
import { salvarNiveis } from './actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

export default async function GamificacaoGestorPage() {
  const supabase = await createClient()
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = hoje.getMonth() + 1

  const { vendedores, niveis } = await calcularGamificacao(supabase, ano, mes)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gamificação — {MESES[mes - 1]}/{ano}</h1>
        <p className="text-sm text-zinc-400">Pontos, níveis e medalhas da equipe. Quem mede e reconhece, engaja.</p>
      </div>

      {/* Ranking de pontos */}
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
                      {v.nivel && (
                        <span className="text-xs" style={{ color: v.nivel.cor }}>
                          {v.nivel.icone} {v.nivel.nome}
                        </span>
                      )}
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
                  <span key={m.slug} title={m.desc} className="rounded bg-white/5 px-2 py-0.5 text-xs">
                    {m.icone} {m.nome}
                  </span>
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

      {/* Configuração de níveis */}
      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle className="text-base">Níveis e Benefícios</CardTitle>
          <p className="text-xs text-slate-400 mt-1">
            Defina as faixas de pontos e o benefício de cada nível (ex: folga, vale, bônus).
          </p>
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
                    <TableCell>
                      <Input name={`nome_${n.id}`} defaultValue={n.nome} className="bg-slate-800 border-slate-700 w-28 h-8" />
                    </TableCell>
                    <TableCell>
                      <Input name={`pts_min_${n.id}`} type="number" defaultValue={n.pts_min} className="bg-slate-800 border-slate-700 w-24 h-8" />
                    </TableCell>
                    <TableCell>
                      <Input name={`pts_max_${n.id}`} type="number" defaultValue={n.pts_max ?? ''} placeholder="∞" className="bg-slate-800 border-slate-700 w-24 h-8" />
                    </TableCell>
                    <TableCell>
                      <Input name={`beneficio_${n.id}`} defaultValue={n.beneficio} placeholder="ex: Folga extra no mês" className="bg-slate-800 border-slate-700" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button type="submit" className="bg-zinc-100 text-zinc-950 hover:bg-white font-medium">Salvar Níveis</Button>
          </form>
        </CardContent>
      </Card>

      {/* Como os pontos são calculados */}
      <Card className="border-slate-800 bg-slate-900">
        <CardHeader><CardTitle className="text-base">Como os pontos são calculados</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-1.5">
            {REGRAS_TEXTO.map((r, i) => (
              <li key={i} className="text-sm text-zinc-300 flex gap-2">
                <span className="text-zinc-500">•</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
