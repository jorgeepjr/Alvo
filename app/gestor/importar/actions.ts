'use server'

import { createClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'
import { revalidatePath } from 'next/cache'

interface LinhaImportada {
  ano: number
  mes: number
  venda_total: number
  cota_total: number
  atendimentos: number
  pecas: number
}

export async function previaImportacao(formData: FormData): Promise<{ linhas: LinhaImportada[] } | { error: string }> {
  const file = formData.get('arquivo') as File
  if (!file || file.size === 0) return { error: 'Selecione um arquivo.' }

  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)

  const linhas: LinhaImportada[] = rows.map((r) => ({
    ano: Number(r.ano ?? r.Ano),
    mes: Number(r.mes ?? r.Mes ?? r.Mês),
    venda_total: Number(r.venda ?? r.Venda ?? r.venda_total ?? 0),
    cota_total: Number(r.cota ?? r.Cota ?? r.cota_total ?? 0),
    atendimentos: Number(r.atendimentos ?? r.Atendimentos ?? 0),
    pecas: Number(r.pecas ?? r.Peças ?? r.peças ?? 0),
  })).filter((l) => l.ano && l.mes)

  return { linhas }
}

export async function confirmarImportacao(linhas: LinhaImportada[]) {
  const supabase = await createClient()
  const rows = linhas.map((l) => ({ ...l, origem: 'importado' as const }))
  await supabase.from('historico_loja').upsert(rows, { onConflict: 'ano,mes' })
  revalidatePath('/gestor/historico')
  return { success: true, total: rows.length }
}
