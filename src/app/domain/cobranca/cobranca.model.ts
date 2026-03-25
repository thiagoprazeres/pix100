import { TipoChave } from '../chave-pix/chave-pix.model';

export type StatusCobranca = 'pendente' | 'paga' | 'expirada' | 'cancelada';

export const STATUS_COBRANCA_LABELS: Record<StatusCobranca, string> = {
  pendente: 'Pendente',
  paga: 'Paga',
  expirada: 'Expirada',
  cancelada: 'Cancelada',
};

export interface SnapshotCobranca {
  chaveId: string;
  chaveValor: string;
  chaveTipo: TipoChave;
  merchantName: string;
  merchantCity: string;
}

export interface Cobranca {
  id: string;
  brCodeRef: string;
  perfilId: string;
  chavePixId: string;
  snapshot: SnapshotCobranca;
  valor: number;
  descricao?: string;
  vencimento?: number;
  statusAtual: StatusCobranca;
  brcode: string;
  qrBase64?: string;
  criadaEm: number;
  atualizadaEm: number;
  providerRef?: string;
}
