export type ChargeStatus =
  | 'pending'
  | 'settled'
  | 'reconciled'
  | 'disputed'
  | 'cancelled';

export type LinkConfidence = 'high' | 'medium' | 'low';

export type LiquidationSource = 'manual' | 'api' | 'statement';

export interface MerchantSnapshot {
  name: string;
  city: string;
  pixKey: string;
  ispb?: string;
}

export interface ChargeIntent {
  txid: string;
  pixKey: string;
  amount: number;
  description?: string;
  brcode: string;
  status: ChargeStatus;
  createdAt: number;
  updatedAt: number;
  expiresAt?: number;
  merchantSnapshot: MerchantSnapshot;
}

export interface PixLiquidation {
  e2eid: string;
  txid: string;
  amount: number;
  paidAt: number;
  payerISPB: string;
  payerName?: string;
  payerDocument?: string;
  source: LiquidationSource;
}

export interface TxidE2EIdLink {
  txid: string;
  e2eid: string;
  linkedAt: number;
  confidence: LinkConfidence;
  verified: boolean;
}

export interface CreateChargeInput {
  pixKey: string;
  amount: number;
  description?: string;
  merchantName: string;
  merchantCity: string;
  brcode: string;
  expiresAt?: number;
}

export interface CreateChargeOutput {
  intent: ChargeIntent;
}

export interface RegisterLiquidationInput {
  intent: ChargeIntent;
  e2eid: string;
  amount: number;
  paidAt: number;
  payerISPB: string;
  payerName?: string;
  payerDocument?: string;
  source: LiquidationSource;
}

export interface RegisterLiquidationOutput {
  liquidation: PixLiquidation;
  link: TxidE2EIdLink;
  updatedIntent: ChargeIntent;
}
