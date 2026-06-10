interface RankingItem {
  id: string
  nome: string
  valor: number
  percentual: number
  atendimentos: number
  pecas: number
}

export function RankingList({ items }: { items: RankingItem[] }) {
  const ordenado = [...items].sort((a, b) => b.percentual - a.percentual)

  return (
    <div className="space-y-2">
      {ordenado.map((item, i) => (
        <div key={item.id} className="flex items-center gap-3 rounded-md border border-slate-800 p-3">
          <span className="text-lg font-bold text-indigo-400 w-6 text-center">{i + 1}</span>
          <div className="flex-1">
            <p className="font-medium">{item.nome}</p>
            <p className="text-xs text-slate-400">
              R$ {item.valor.toFixed(2)} · {item.atendimentos} atend. · {item.pecas} peças
            </p>
          </div>
          <span className={`font-bold ${item.percentual >= 100 ? 'text-green-400' : item.percentual < 50 ? 'text-red-400' : 'text-slate-200'}`}>
            {item.percentual.toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  )
}
