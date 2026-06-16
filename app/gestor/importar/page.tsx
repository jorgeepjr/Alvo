'use client'

import { useState } from 'react'
import { previaImportacao, confirmarImportacao } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface LinhaImportada {
  ano: number
  mes: number
  venda_total: number
  cota_total: number
  atendimentos: number
  pecas: number
}

export default function ImportarPage() {
  const [linhas, setLinhas] = useState<LinhaImportada[]>([])
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<string | null>(null)

  async function handlePreview(formData: FormData) {
    setError(null)
    setResultado(null)
    const result = await previaImportacao(formData)
    if ('error' in result) {
      setError(result.error)
      return
    }
    setLinhas(result.linhas)
  }

  async function handleConfirmar() {
    const result = await confirmarImportacao(linhas)
    setResultado(`${result.total} registros importados com sucesso.`)
    setLinhas([])
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Importar Histórico</h1>

      <Card className="border-slate-800 bg-slate-900">
        <CardHeader><CardTitle className="text-base">Upload de Arquivo (Excel/CSV)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <form action={handlePreview} className="flex gap-2 items-end">
            <div className="space-y-1">
              <Label htmlFor="arquivo">Arquivo</Label>
              <Input id="arquivo" name="arquivo" type="file" accept=".xlsx,.xls,.csv" className="bg-slate-800 border-slate-700" />
            </div>
            <Button type="submit" variant="outline">Pré-visualizar</Button>
          </form>
          {error && <p className="text-sm text-red-400">{error}</p>}
          {resultado && <p className="text-sm text-green-400">{resultado}</p>}
          <p className="text-xs text-slate-500">
            Colunas esperadas: ano, mes, venda, cota, atendimentos, pecas
          </p>
        </CardContent>
      </Card>

      {linhas.length > 0 && (
        <Card className="border-slate-800 bg-slate-900">
          <CardHeader><CardTitle className="text-base">Pré-visualização ({linhas.length} linhas)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ano</TableHead>
                  <TableHead>Mês</TableHead>
                  <TableHead>Venda</TableHead>
                  <TableHead>Cota</TableHead>
                  <TableHead>Atend.</TableHead>
                  <TableHead>Peças</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map((l, i) => (
                  <TableRow key={i}>
                    <TableCell>{l.ano}</TableCell>
                    <TableCell>{l.mes}</TableCell>
                    <TableCell>{l.venda_total}</TableCell>
                    <TableCell>{l.cota_total}</TableCell>
                    <TableCell>{l.atendimentos}</TableCell>
                    <TableCell>{l.pecas}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button onClick={handleConfirmar} className="bg-zinc-100 text-zinc-950 hover:bg-white font-medium">Confirmar Importação</Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
