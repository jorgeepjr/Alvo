import { Fragment } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

interface LinhaHistorico {
  ano: number
  mensal: (number | null)[]
}

export function HistoricoTable({ vendas, cotas }: { vendas: LinhaHistorico[]; cotas: LinhaHistorico[] }) {
  const anos = vendas.map((v) => v.ano).sort()

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead></TableHead>
          {MESES.map((m) => <TableHead key={m}>{m}</TableHead>)}
          <TableHead>Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {anos.map((ano) => {
          const venda = vendas.find((v) => v.ano === ano)?.mensal ?? Array(12).fill(null)
          const cota = cotas.find((c) => c.ano === ano)?.mensal ?? Array(12).fill(null)
          const totalVenda = venda.reduce((acc: number, v) => acc + (v ?? 0), 0)
          const totalCota = cota.reduce((acc: number, v) => acc + (v ?? 0), 0)

          return (
            <Fragment key={ano}>
              <TableRow className="border-t-2 border-slate-700">
                <TableCell className="font-bold">{ano} Venda</TableCell>
                {venda.map((v, i) => <TableCell key={i}>{v != null ? v.toFixed(0) : '-'}</TableCell>)}
                <TableCell className="font-bold">{totalVenda.toFixed(0)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-slate-400">{ano} Cota</TableCell>
                {cota.map((v, i) => <TableCell key={i} className="text-slate-400">{v != null ? v.toFixed(0) : '-'}</TableCell>)}
                <TableCell className="text-slate-400">{totalCota.toFixed(0)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-slate-400">{ano} Dif</TableCell>
                {venda.map((v, i) => {
                  const c = cota[i]
                  const dif = v != null && c != null ? v - c : null
                  return (
                    <TableCell key={i} className={dif == null ? '' : dif >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {dif != null ? dif.toFixed(0) : '-'}
                    </TableCell>
                  )
                })}
                <TableCell className={totalVenda - totalCota >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {(totalVenda - totalCota).toFixed(0)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-slate-400">{ano} %</TableCell>
                {venda.map((v, i) => {
                  const c = cota[i]
                  const pct = v != null && c != null && c > 0 ? (v / c) * 100 : null
                  return (
                    <TableCell key={i} className={pct == null ? '' : pct >= 100 ? 'text-green-400' : 'text-red-400'}>
                      {pct != null ? `${pct.toFixed(0)}%` : '-'}
                    </TableCell>
                  )
                })}
                <TableCell className={totalCota > 0 && totalVenda / totalCota >= 1 ? 'text-green-400' : 'text-red-400'}>
                  {totalCota > 0 ? `${((totalVenda / totalCota) * 100).toFixed(0)}%` : '-'}
                </TableCell>
              </TableRow>
            </Fragment>
          )
        })}
      </TableBody>
    </Table>
  )
}
