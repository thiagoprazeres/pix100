export type TipoChave = 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria' | 'desconhecida';
export type TipoPessoa = 'PF' | 'PJ';
export type StatusChave = 'ativa' | 'inativa' | 'arquivada';
export type VerificacaoChave = 'nao_verificada' | 'confirmada_por_recebimento';

export interface ChavePix {
  id: string;
  perfilId: string;
  tipo: TipoChave;
  valor: string;
  tipoPessoa: TipoPessoa;
  status: StatusChave;
  verificacaoStatus: VerificacaoChave;
  criadaEm: number;
  arquivadaEm?: number;
}

export const TIPO_CHAVE_LABELS: Record<TipoChave, string> = {
  cpf: 'CPF',
  cnpj: 'CNPJ',
  email: 'E-mail',
  telefone: 'Telefone',
  aleatoria: 'Aleatória',
  desconhecida: 'Desconhecida',
};

export const STATUS_CHAVE_LABELS: Record<StatusChave, string> = {
  ativa: 'Ativa',
  inativa: 'Inativa',
  arquivada: 'Arquivada',
};
