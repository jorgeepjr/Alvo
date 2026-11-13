'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface PontoDia {
  dia: number
  atual: number | null
  anoPassado: number | null
  meta: number | null
  projecao: number | null
}

export function MesAtualChart({
  dados,
  anoAtual,
  anoPassado,
}: {
  dados: PontoDia[]
  anoAtual: number
  anoPassado: number
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={dados}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1a2540" />
        <XAxis dataKey="dia" stroke="#94a3b8" />
        <YAxis stroke="#94a3b8" tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
        <Tooltip
          contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}
          formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          labelFormatter={(dia) => `Dia ${dia}`}
        />
        <Legend />
        <Line type="monotone" dataKey="atual" name={`${anoAtual} (vendido)`} stroke="#22d3ee" strokeWidth={3} connectNulls dot={false} />
        <Line type="monotone" dataKey="projecao" name="Projeção provável" stroke="#22d3ee" strokeWidth={2} strokeDasharray="6 4" connectNulls dot={false} />
        <Line type="monotone" dataKey="anoPassado" name={`${anoPassado}`} stroke="#55637d" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="meta" name="Ritmo da meta" stroke="#a78bfa" strokeWidth={2} strokeDasharray="3 3" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
