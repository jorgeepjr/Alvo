export type Perfil = 'gestor' | 'vendedor'
export type SituacaoDia = 'normal' | 'feriado' | 'fechado'
export type SituacaoVendedor = 'normal' | 'atestado' | 'nao_trabalhou'
export type Origem = 'importado' | 'sistema'

export interface Profile {
  id: string
  nome: string
  perfil: Perfil
  ativo: boolean
  criado_em: string
}

export interface MetaMensal {
  id: string
  ano: number
  mes: number
  meta_valor: number
  meta_atendimentos: number
  meta_pecas: number
  criado_em: string
}

export interface DistribuicaoDiaria {
  id: string
  vendedor_id: string | null
  data: string
  cota_valor: number
  cota_atendimentos: number
  cota_pecas: number
  situacao: SituacaoDia
  /** true = dia salvo pelo gestor; o recálculo automático não mexe nele */
  cota_fixada: boolean
}

export interface Lancamento {
  id: string
  vendedor_id: string | null
  data: string
  atendimentos: number
  pecas: number
  valor: number
  observacao: string | null
  situacao_vendedor: SituacaoVendedor
  dia_fechado: boolean
  criado_por: string
  criado_em: string
}

export interface MetaVendedorPercentual {
  id: string
  ano: number
  mes: number
  vendedor_id: string
  percentual: number
}

export interface Tarefa {
  id: string
  vendedor_id: string | null
  data: string
  descricao: string
  concluida: boolean
  criado_por: string
  criado_em: string
}

export interface RotinaModelo {
  id: string
  dia_semana: number
  horario: string
  bloco: string
  descricao: string
  ordem: number
  atribuido_a: number | null
}

export interface RotinaConcluida {
  id: string
  vendedor_id: string
  data: string
  item_id: string
  concluida_em: string
}

export interface HistoricoLoja {
  id: string
  ano: number
  mes: number
  venda_total: number
  cota_total: number
  atendimentos: number
  pecas: number
  origem: Origem
}
