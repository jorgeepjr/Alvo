import Link from 'next/link'
import { SeletorMes } from '@/components/seletor-mes'
import { hojeBR, ymDe } from '@/lib/datas'

// Cabeçalho padrão das telas: área, título, "pra que serve" e o seletor de mês.
export function TopoPagina({
  area,
  titulo,
  descricao,
  ym,
  ajuda,
}: {
  area: string
  titulo: string
  descricao?: React.ReactNode
  /** se vier, mostra o seletor de mês */
  ym?: string
  /** link do "Como funciona" */
  ajuda?: string
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <div className="text-[11px] font-extrabold uppercase tracking-widest text-cyan-300">{area}</div>
          <h1 className="text-2xl font-bold">{titulo}</h1>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {ym && <SeletorMes ym={ym} ymHoje={ymDe(hojeBR())} />}
          {ajuda && (
            <Link href={ajuda} className="rounded-lg border border-white/10 bg-[#16213a] px-3 py-2 text-sm font-semibold hover:border-cyan-400">
              ❓ Como funciona
            </Link>
          )}
        </div>
      </div>
      {descricao && <p className="text-sm text-slate-400">{descricao}</p>}
    </div>
  )
}
