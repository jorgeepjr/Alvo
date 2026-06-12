import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type Linha = {
  mes: number
  nome: string
  valoresPorAno: (number | null)[]
  variacoes: (number | null)[]
}

function formatarValor(valor: number | null, metrica: 'valor' | 'atendimentos' | 'pecas') {
  if (valor === null) return '—'
  if (metrica === 'valor') return `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  return valor.toLocaleString('pt-BR')
}

export function ComparativoTable({
  anos,
  linhas,
  metrica,
}: {
  anos: number[]
  linhas: Linha[]
  metrica: 'valor' | 'atendimentos' | 'pecas'
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Mês</TableHead>
          {anos.map((ano, idx) => (
            <>
              <TableHead key={ano}>{ano}</TableHead>
              {idx > 0 && <TableHead key={`${ano}-var`}>Var. {ano - 1}→{ano}</TableHead>}
            </>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {linhas.map((linha) => (
          <TableRow key={linha.mes}>
            <TableCell className="font-medium">{linha.nome}</TableCell>
            {anos.map((ano, idx) => (
              <>
                <TableCell key={ano}>{formatarValor(linha.valoresPorAno[idx], metrica)}</TableCell>
                {idx > 0 && (
                  <TableCell
                    key={`${ano}-var`}
                    className={
                      linha.variacoes[idx] === null
                        ? 'text-slate-500'
                        : linha.variacoes[idx]! >= 0
                        ? 'text-green-400'
                        : 'text-red-400'
                    }
                  >
                    {linha.variacoes[idx] === null
                      ? '—'
                      : `${linha.variacoes[idx]! >= 0 ? '▲' : '▼'} ${Math.abs(linha.variacoes[idx]!).toFixed(1)}%`}
                  </TableCell>
                )}
              </>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
