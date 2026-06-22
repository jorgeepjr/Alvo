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
  Cell,
} from 'recharts'

type Ponto = { dia: number; vendido: number | null; cota: number | null }

export function DiaOscilacaoChart({ dados }: { dados: Ponto[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={dados}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
        <XAxis dataKey="dia" stroke="#94a3b8" fontSize={12} interval="preserveStartEnd" />
        <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
        <Tooltip
          cursor={{ fill: 'rgba(255,255,255,0.05)' }}
          contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}
          formatter={(value, name) => [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, name]}
          labelFormatter={(dia) => `Dia ${dia}`}
        />
        <Legend />
        <Bar dataKey="vendido" name="Vendido no dia" radius={[3, 3, 0, 0]}>
          {dados.map((d) => (
            <Cell key={d.dia} fill={d.cota != null && d.vendido != null && d.vendido >= d.cota ? '#22c55e' : '#ef4444'} />
          ))}
        </Bar>
        <Line type="monotone" dataKey="cota" name="Cota do dia" stroke="#38bdf8" strokeWidth={2} strokeDasharray="4 4" dot={false} connectNulls />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
