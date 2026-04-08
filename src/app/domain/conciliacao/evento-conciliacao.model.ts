import { StatusCobranca } from '../cobranca/cobranca.model';

export type OrigemEvento = 'manual' | 'sistema';
export type TipoEvento =
  | 'criada'
  | 'confirmada_manualmente'
  | 'desconfirmada'
  | 'expirada_automaticamente'
  | 'cancelada'
  | 'pagador_registrado'
  | 'devolucao_solicitada_med'
  | 'devolucao_confirmada_med';

export const TIPO_EVENTO_LABELS: Record<TipoEvento, string> = {
  criada: 'Cobrança criada',
  confirmada_manualmente: 'Confirmada manualmente',
  desconfirmada: 'Confirmação desfeita',
  expirada_automaticamente: 'Expirada automaticamente',
  cancelada: 'Cancelada',
  pagador_registrado: 'Pagador registrado',
  devolucao_solicitada_med: 'Devolução solicitada (MED)',
  devolucao_confirmada_med: 'Devolução confirmada (MED)',
};

export interface EventoConciliacao {
  id: string;
  cobrancaId: string;
  tipo: TipoEvento;
  origem: OrigemEvento;
  ator?: string;
  timestamp: number;
  statusAnterior: StatusCobranca;
  statusNovo: StatusCobranca;
  idempotencyKey: string;
  payloadBruto?: string;
}
