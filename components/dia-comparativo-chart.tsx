'use client'

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

type Ponto = { label: string; valor: number; anoAnterior: number | null }

export function DiaComparativoChart({ dados, anoAtual }: { dados: Ponto[]; anoAtual: number }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={dados}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
        <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} interval="preserveStartEnd" />
        <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
        <Tooltip
          cursor={{ fill: 'rgba(255,255,255,0.05)' }}
          contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}
          formatter={(value, name) => [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, name]}
          labelFormatter={(dia) => `Dia ${dia}`}
        />
        <Legend />
        <Bar dataKey="valor" name={`${anoAtual}`} fill="#efefef" radius={[3, 3, 0, 0]} />
        <Line type="monotone" dataKey="anoAnterior" name={`${anoAtual - 1}`} stroke="#f59e0b" strokeWidth={2} dot={false} connectNulls />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
