'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function criarTarefa(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const data = formData.get('data') as string
  const descricao = formData.get('descricao') as string
  const vendedorIdRaw = formData.get('vendedor_id') as string
  const vendedor_id = vendedorIdRaw === 'todos' ? null : vendedorIdRaw

  if (!descricao) return

  await supabase.from('tarefas').insert({
    vendedor_id,
    data,
    descricao,
    criado_por: user.id,
  })

  revalidatePath('/gestor/tarefas')
  revalidatePath('/painel')
}

export async function excluirTarefa(tarefaId: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('tarefas').delete().eq('id', tarefaId)
  revalidatePath('/gestor/tarefas')
  revalidatePath('/painel')
}

export async function alternarConclusaoTarefa(tarefaId: string, concluida: boolean): Promise<void> {
  const supabase = await createClient()
  await supabase.from('tarefas').update({ concluida }).eq('id', tarefaId)
  revalidatePath('/gestor/tarefas')
  revalidatePath('/painel')
}

// Define quem faz um bloco da rotina (dia + horário + bloco):
// '' = ambos (NULL), '0' = primeiro vendedor, '1' = segundo vendedor.
export async function atribuirBlocoRotina(
  diaSemana: number,
  horario: string,
  bloco: string,
  formData: FormData
): Promise<void> {
  const supabase = await createClient()
  const atribuidoRaw = (formData.get('atribuidoRaw') as string) ?? ''
  const atribuido_a = atribuidoRaw === '' ? null : Number(atribuidoRaw)

  await supabase
    .from('rotina_modelo')
    .update({ atribuido_a })
    .eq('dia_semana', diaSemana)
    .eq('horario', horario)
    .eq('bloco', bloco)

  revalidatePath('/gestor/tarefas')
  revalidatePath('/painel')
}

// Divide a rotina automaticamente entre os dois vendedores de forma inteligente:
// - Blocos que exigem decisão conjunta (vitrine/looks, estratégia digital) ficam
//   como "Ambos".
// - Os demais blocos ganham um dono único (evita o "cachorro de 2 donos").
// - A carga é equilibrada por dia (conta as tarefas) e o dono se alterna a cada
//   dia da semana (rotação diária), para não sobrecarregar sempre a mesma pessoa.
export async function dividirRotinaAutomatico(): Promise<void> {
  const supabase = await createClient()

  const { data: itens } = await supabase
    .from('rotina_modelo')
    .select('dia_semana, horario, bloco, ordem')
    .order('dia_semana')
    .order('ordem')

  if (!itens || itens.length === 0) return

  // Blocos que ficam com os dois (precisam conversar/decidir juntos).
  const ehCompartilhado = (bloco: string) => {
    const b = bloco.toLowerCase()
    return b.includes('vitrine') || b.includes('montagem de looks') || b.includes('estratégia digital')
  }

  // Blocos por dia (preservando a ordem) com a contagem de tarefas de cada um.
  const blocosPorDia = new Map<number, { horario: string; bloco: string; qtd: number }[]>()
  for (const it of itens) {
    if (!blocosPorDia.has(it.dia_semana)) blocosPorDia.set(it.dia_semana, [])
    const lista = blocosPorDia.get(it.dia_semana)!
    const existente = lista.find((b) => b.horario === it.horario && b.bloco === it.bloco)
    if (existente) existente.qtd++
    else lista.push({ horario: it.horario, bloco: it.bloco, qtd: 1 })
  }

  for (const [diaSemana, blocos] of blocosPorDia) {
    // Carga (nº de tarefas) acumulada por vendedor neste dia.
    const carga = [0, 0]
    // Alterna quem "começa" conforme o dia, para a rotação ser diária.
    const inicio = diaSemana % 2

    for (const b of blocos) {
      let atribuido_a: number | null
      if (ehCompartilhado(b.bloco)) {
        atribuido_a = null
      } else {
        // Dá o bloco para quem tem menos carga; empate → quem começa hoje.
        if (carga[0] < carga[1]) atribuido_a = 0
        else if (carga[1] < carga[0]) atribuido_a = 1
        else atribuido_a = inicio
        carga[atribuido_a] += b.qtd
      }

      await supabase
        .from('rotina_modelo')
        .update({ atribuido_a })
        .eq('dia_semana', diaSemana)
        .eq('horario', b.horario)
        .eq('bloco', b.bloco)
    }
  }

  revalidatePath('/gestor/tarefas')
  revalidatePath('/painel')
}

export async function alternarItemRotina(itemId: string, data: string, concluido: boolean): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  if (concluido) {
    await supabase.from('rotina_concluida').insert({ vendedor_id: user.id, data, item_id: itemId })
  } else {
    await supabase.from('rotina_concluida').delete().eq('vendedor_id', user.id).eq('data', data).eq('item_id', itemId)
  }

  revalidatePath('/painel')
}
