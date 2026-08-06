import { formatBRL } from '@/lib/calculos'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// Super Meta da loja (mês): total vendido pela loja vs um alvo acima da meta
// normal, com um prêmio ao bater. Não aparece se não estiver configurada.
export function SuperMetaCard({ vendido, meta, premio }: { vendido: number; meta: number; premio: string }) {
  if (!meta || meta <= 0) return null

  const pct = Math.min((vendido / meta) * 100, 100)
  const bateu = vendido >= meta
  const falta = Math.max(meta - vendido, 0)

  return (
    <Card className={`border-slate-800 ${bateu ? 'bg-gradient-to-r from-cyan-950/40 to-slate-900' : 'bg-slate-900'}`}>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">🏆 Super Meta da Loja</CardTitle>
          <span className={`text-xs font-semibold ${bateu ? 'text-cyan-300' : 'text-slate-400'}`}>{pct.toFixed(0)}%</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-200">R$ {formatBRL(vendido)}</span>
          <span className="text-slate-400">Super Meta: R$ {formatBRL(meta)}</span>
        </div>
        <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-sky-500 shadow-[0_0_12px_oklch(0.75_0.13_233_/_0.6)] transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        {bateu ? (
          <p className="text-sm font-medium text-cyan-300">🎉 Super Meta batida! Prêmio: {premio || '—'}</p>
        ) : (
          <p className="text-sm text-slate-400">
            Faltam <b className="text-slate-200">R$ {formatBRL(falta)}</b> para a Super Meta
            {premio ? <> — prêmio: <span className="text-cyan-300">{premio}</span></> : null}.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
