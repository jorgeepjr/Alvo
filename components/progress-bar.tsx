import { Progress } from '@/components/ui/progress'

export function ProgressBar({ label, atual, meta, formatar }: { label: string; atual: number; meta: number; formatar?: (v: number) => string }) {
  const pct = meta > 0 ? (atual / meta) * 100 : 0
  const fmt = formatar ?? ((v: number) => v.toFixed(0))
  const cor = pct >= 100 ? 'text-green-400' : pct < 50 ? 'text-red-400' : 'text-slate-300'

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className={cor}>{fmt(atual)} / {fmt(meta)} ({pct.toFixed(1)}%)</span>
      </div>
      <Progress value={Math.min(pct, 100)} />
    </div>
  )
}
