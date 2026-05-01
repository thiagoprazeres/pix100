import { TipoChave } from '../chave-pix/chave-pix.model';
import type { ChargeIntent } from '@thiagoprazeres/pix-charge-core';
import type { AntiFraudDecision } from '@thiagoprazeres/pix-antifraud-core';
import type { ReconciliationResult } from '@thiagoprazeres/pix-reconcile-core';
import type { TrustedReceipt } from '@thiagoprazeres/trusted-receipt-core';

export type StatusCobranca = 'pendente' | 'paga' | 'expirada' | 'cancelada' | 'devolvida';

export type TipoConta = 'CACC' | 'SVGS' | 'TRAN' | 'SLRY';

export const TIPO_CONTA_LABELS: Record<TipoConta, string> = {
  CACC: 'Conta Corrente',
  SVGS: 'Conta Poupança',
  TRAN: 'Conta de Pagamento',
  SLRY: 'Conta Salário',
};

export interface Pagador {
  nome?: string;
  documento?: string;
  banco?: string;
  nomeBanco?: string;
  agencia?: string;
  conta?: string;
  tipoConta?: TipoConta;
  chavePix?: string;
  endToEndId?: string;
  paidAt: number;
}

export const STATUS_COBRANCA_LABELS: Record<StatusCobranca, string> = {
  pendente: 'Pendente',
  paga: 'Paga',
  expirada: 'Expirada',
  cancelada: 'Cancelada',
  devolvida: 'Devolvida (MED)',
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
  qrSvg?: string;
  pagador?: Pagador;
  criadaEm: number;
  atualizadaEm: number;
  providerRef?: string;
  chargeIntent?: ChargeIntent;
  antiFraudDecision?: AntiFraudDecision;
  reconciliationResult?: ReconciliationResult;
  trustedReceipt?: TrustedReceipt;
}
