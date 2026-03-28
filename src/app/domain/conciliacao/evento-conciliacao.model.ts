import { StatusCobranca } from '../cobranca/cobranca.model';

export type OrigemEvento = 'manual' | 'sistema';
export type TipoEvento =
  | 'criada'
  | 'confirmada_manualmente'
  | 'desconfirmada'
  | 'expirada_automaticamente'
  | 'cancelada'
  | 'comprovante_anexado';

export const TIPO_EVENTO_LABELS: Record<TipoEvento, string> = {
  criada: 'Cobrança criada',
  confirmada_manualmente: 'Confirmada manualmente',
  desconfirmada: 'Confirmação desfeita',
  expirada_automaticamente: 'Expirada automaticamente',
  cancelada: 'Cancelada',
  comprovante_anexado: 'Comprovante anexado',
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
