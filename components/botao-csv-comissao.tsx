'use client'

import { Button } from '@/components/ui/button'

export type LinhaCSV = {
  nome: string
  vendido: number
  meta: number
  bateu: boolean
  percentual: number
  comissao: number
}

export function BotaoCsvComissao({ linhas, nomeArquivo }: { linhas: LinhaCSV[]; nomeArquivo: string }) {
  function baixar() {
    const cab = ['Vendedor', 'Vendido', 'Meta', 'Bateu meta', '% Comissao', 'Comissao']
    const num = (n: number) => n.toFixed(2).replace('.', ',')
    const linhasCsv = linhas.map((l) =>
      [l.nome, num(l.vendido), num(l.meta), l.bateu ? 'Sim' : 'Nao', num(l.percentual), num(l.comissao)].join(';'),
    )
    const csv = [cab.join(';'), ...linhasCsv].join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = nomeArquivo
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={baixar} disabled={linhas.length === 0}>
      Exportar CSV
    </Button>
  )
}
