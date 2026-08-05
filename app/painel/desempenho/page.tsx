import { createClient } from '@/lib/supabase/server'
import { calcularGamificacao, TIPOS_DESAFIO } from '@/lib/gamificacao'
import { formatBRL } from '@/lib/calculos'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { calcularComissao } from '@/lib/comissao'

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

export default async function MeuDesempenhoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = hoje.getMonth() + 1

  const { vendedores, config } = await calcularGamificacao(supabase, ano, mes)
  const eu = vendedores.find((v) => v.id === user!.id)

  if (!eu) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Meu Desempenho</h1>
        <p className="text-sm text-zinc-400">Ainda não há dados de gamificação para você neste mês.</p>
      </div>
    )
  }

  const comissao = calcularComissao(eu.valorMes, eu.cotaMes, {
    pctComMeta: Number(config.com_pct_meta),
    pctSemMeta: Number(config.com_pct_sem),
  })

  const progressoNivel = eu.proximoNivel
    ? Math.min(
        ((eu.pontos - (eu.nivel?.pts_min ?? 0)) / (eu.proximoNivel.pts_min - (eu.nivel?.pts_min ?? 0))) * 100,
        100
      )
    : 100

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Meu Desempenho — {MESES[mes - 1]}</h1>
        <p className="text-sm text-zinc-400">Seus pontos, nível e medalhas do mês.</p>
      </div>

      {/* Nível e pontos */}
      <Card className="border-zinc-700 bg-gradient-to-r from-zinc-900/70 to-slate-900">
        <CardContent className="py-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm text-zinc-400">Seu nível</p>
              <p className="text-3xl font-bold" style={{ color: eu.nivel?.cor ?? '#fff' }}>
                {eu.nivel?.icone} {eu.nivel?.nome ?? '—'}
              </p>
              {eu.nivel?.beneficio && <p className="text-sm text-green-400 mt-1">🎁 {eu.nivel.beneficio}</p>}
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold">{eu.pontos}</p>
              <p className="text-sm text-zinc-500">pontos</p>
            </div>
          </div>

          {eu.proximoNivel && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-zinc-400 mb-1">
                <span>{eu.nivel?.nome}</span>
                <span>Faltam {eu.faltaProximo} pts para {eu.proximoNivel.icone} {eu.proximoNivel.nome}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full rounded-full bg-zinc-100" style={{ width: `${progressoNivel}%` }} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comissão do mês */}
      <Card className="border-slate-800 bg-slate-900">
        <CardHeader><CardTitle className="text-base">💵 Sua comissão do mês</CardTitle></CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-green-400">R$ {formatBRL(comissao.comissao)}</p>
          <p className="text-sm text-slate-400 mt-1">
            {comissao.bateu
              ? `✅ Você bateu a meta → ${comissao.percentual}% sobre R$ ${formatBRL(eu.valorMes)}`
              : `${comissao.percentual}% sobre R$ ${formatBRL(eu.valorMes)} · faltam R$ ${formatBRL(comissao.faltaParaMeta)} para virar ${Number(config.com_pct_meta)}%`}
          </p>
        </CardContent>
      </Card>

      {/* De onde vêm os pontos */}
      <Card className="border-slate-800 bg-slate-900">
        <CardHeader><CardTitle className="text-base">De onde vêm seus pontos</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-center">
          {[
            { l: 'Meta', v: eu.detalhe.meta },
            { l: 'Dias batendo', v: eu.detalhe.dias },
            { l: 'Conversão', v: eu.detalhe.conversao },
            { l: 'Rotina', v: eu.detalhe.rotina },
            { l: 'Sequência', v: eu.detalhe.streak },
            { l: 'Desafios', v: eu.detalhe.desafios },
          ].map((x) => (
            <div key={x.l} className="rounded-md border border-slate-800 bg-slate-950/40 py-3">
              <p className="text-xl font-bold">{x.v}</p>
              <p className="text-xs text-slate-500">{x.l}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Desafios ativos */}
      {eu.desafios.length > 0 && (
        <Card className="border-slate-800 bg-slate-900">
          <CardHeader><CardTitle className="text-base">🎮 Desafios</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {eu.desafios.map((dp) => {
              const unidade = TIPOS_DESAFIO.find((t) => t.valor === dp.desafio.tipo)?.unidade ?? ''
              const pct = Number(dp.desafio.alvo) > 0 ? Math.min((dp.atual / Number(dp.desafio.alvo)) * 100, 100) : 0
              const fmt = (n: number) => (dp.desafio.tipo === 'valor' ? `R$ ${formatBRL(n)}` : `${Math.round(n)} ${unidade}`)
              return (
                <div key={dp.desafio.id} className="rounded-md border border-slate-800 bg-slate-950/40 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">
                      {dp.concluido ? '✅ ' : ''}{dp.desafio.titulo}{' '}
                      <span className="text-xs text-slate-400">(+{dp.desafio.pontos} pts)</span>
                    </p>
                    <span className="text-xs text-slate-400">{fmt(dp.atual)} / {fmt(Number(dp.desafio.alvo))}</span>
                  </div>
                  {dp.desafio.descricao && <p className="text-xs text-slate-500 mt-0.5">{dp.desafio.descricao}</p>}
                  <div className="h-2 rounded-full bg-slate-800 overflow-hidden mt-2">
                    <div className={`h-full rounded-full ${dp.concluido ? 'bg-green-500' : 'bg-zinc-100'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Medalhas */}
      <Card className="border-slate-800 bg-slate-900">
        <CardHeader><CardTitle className="text-base">Medalhas</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {eu.medalhas.map((m) => (
            <div
              key={m.slug}
              className={`flex items-center gap-3 rounded-md border p-3 ${
                m.conquistada ? 'border-green-800 bg-green-950/20' : 'border-slate-800 bg-slate-950/40 opacity-60'
              }`}
            >
              <span className="text-2xl">{m.conquistada ? m.icone : '🔒'}</span>
              <div>
                <p className="text-sm font-medium">{m.nome}</p>
                <p className="text-xs text-slate-400">{m.desc}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <p className="text-xs text-slate-500">
        Resumo do mês: vendido R$ {formatBRL(eu.valorMes)} de R$ {formatBRL(eu.cotaMes)} · conversão {eu.conversao.toFixed(0)}%.
      </p>
    </div>
  )
}
