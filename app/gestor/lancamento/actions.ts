'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { atualizarHistoricoMes } from '@/lib/historico'
import { parseValorBR } from '@/lib/valor'

// O gestor lança ou corrige qualquer dia (pelo fechamento de caixa). O que ele
// salva é o número oficial do dia e fica marcado "corrigido por <nome> em <data hora>".
// Depois disso, as vendas que o vendedor registrar nesse dia não sobrescrevem mais.
export async function salvarLancamentoGestor(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const data = formData.get('data') as string
  const vendedorIdRaw = formData.get('vendedor_id') as string
  const vendedor_id = vendedorIdRaw === 'loja' ? null : vendedorIdRaw
  const atendimentos = Math.max(0, Math.round(Number(formData.get('atendimentos')) || 0))
  const pecas = Math.max(0, Math.round(Number(formData.get('pecas')) || 0))
  const valor = parseValorBR(formData.get('valor'))
  const valor_whatsapp = parseValorBR(formData.get('valor_whatsapp'))
  const corr = { corrigido_por: user.id, corrigido_em: new Date().toISOString() }

  let query = supabase.from('lancamentos').select('id').eq('data', data)
  query = vendedor_id === null ? query.is('vendedor_id', null) : query.eq('vendedor_id', vendedor_id)
  const { data: existente } = await query.maybeSingle()

  if (existente) {
    await supabase
      .from('lancamentos')
      .update({ atendimentos, pecas, valor, valor_whatsapp, ...corr })
      .eq('id', existente.id)
  } else {
    await supabase.from('lancamentos').insert({
      vendedor_id,
      data,
      atendimentos,
      pecas,
      valor,
      valor_whatsapp,
      situacao_vendedor: 'normal',
      criado_por: user.id,
      ...corr,
    })
  }

  await atualizarHistoricoMes(supabase, data)
  revalidar()
  redirect(`/gestor/lancamento?data=${data}&vendedor=${vendedorIdRaw}&ok=1`)
}

export async function apagarLancamento(id: string, data: string, vendedor: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('lancamentos').delete().eq('id', id)
  await atualizarHistoricoMes(supabase, data)
  revalidar()
  redirect(`/gestor/lancamento?data=${data}&vendedor=${vendedor}`)
}

function revalidar() {
  revalidatePath('/gestor/lancamento')
  revalidatePath('/gestor')
  revalidatePath('/painel')
  revalidatePath('/gestor/historico')
}

export async function salvarNotaDia(data: string, formData: FormData): Promise<void> {
  const supabase = await createClient()
  const motivo = ((formData.get('motivo') as string) || '').trim()
  if (motivo) {
    await supabase.from('dia_nota').upsert({ data, motivo, atualizado_em: new Date().toISOString() }, { onConflict: 'data' })
  } else {
    await supabase.from('dia_nota').delete().eq('data', data)
  }
  revalidatePath('/gestor/lancamento')
}

// "Fechar Dia" apenas TRAVA a edição dos lançamentos do dia (dia_fechado).
// NÃO marca o dia como loja fechada — isso tirava o dia da conta de dias úteis
// e quebrava a projeção. Loja fechada/feriado é feito pela aba Metas.
export async function fecharDia(data: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('lancamentos').update({ dia_fechado: true }).eq('data', data)
  revalidatePath('/gestor/lancamento')
  revalidatePath('/painel/lancamento')
}
