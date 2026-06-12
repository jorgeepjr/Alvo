'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface PontoDia {
  dia: number
  atual: number | null
  meta: number | null
  projecao: number | null
}

export function MeuMesChart({ dados }: { dados: PontoDia[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={dados}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis dataKey="dia" stroke="#94a3b8" />
        <YAxis stroke="#94a3b8" tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
        <Tooltip
          contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}
          formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          labelFormatter={(dia) => `Dia ${dia}`}
        />
        <Legend />
        <Line type="monotone" dataKey="atual" name="Vendido (real)" stroke="#6366f1" strokeWidth={3} connectNulls dot={false} />
        <Line type="monotone" dataKey="projecao" name="Se continuar no ritmo" stroke="#94a3b8" strokeWidth={2} strokeDasharray="6 4" connectNulls dot={false} />
        <Line type="monotone" dataKey="meta" name="Minha meta" stroke="#22c55e" strokeWidth={2} strokeDasharray="3 3" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
