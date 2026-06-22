'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

type Ponto = { label: string; valor: number }

export function BarrasChart({ dados, destaque }: { dados: Ponto[]; destaque?: string }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={dados}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
        <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} interval="preserveStartEnd" />
        <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
        <Tooltip
          cursor={{ fill: 'rgba(255,255,255,0.05)' }}
          contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}
          formatter={(value) => [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Faturamento']}
        />
        <Bar dataKey="valor" radius={[3, 3, 0, 0]}>
          {dados.map((d) => (
            <Cell key={d.label} fill={destaque && d.label === destaque ? '#38bdf8' : '#efefef'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
