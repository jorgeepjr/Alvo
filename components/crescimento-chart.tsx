'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const CORES = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4']

interface SerieAno {
  ano: number
  acumulado: (number | null)[]
}

export function CrescimentoChart({ series }: { series: SerieAno[] }) {
  const dados = MESES.map((mes, i) => {
    const linha: Record<string, number | string | null> = { mes }
    series.forEach((s) => {
      linha[String(s.ano)] = s.acumulado[i]
    })
    return linha
  })

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={dados}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis dataKey="mes" stroke="#94a3b8" />
        <YAxis stroke="#94a3b8" />
        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }} />
        <Legend />
        {series.map((s, i) => (
          <Line key={s.ano} type="monotone" dataKey={String(s.ano)} stroke={CORES[i % CORES.length]} strokeWidth={2} connectNulls />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
