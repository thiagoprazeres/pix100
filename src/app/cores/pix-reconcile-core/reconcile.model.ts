import { AntiFraudDecision } from '../pix-antifraud-core';
import { ChargeIntent, PixLiquidation, TxidE2EIdLink } from '../pix-charge-core';

export type ReconciliationStatus =
  | 'matched'
  | 'partial'
  | 'over'
  | 'disputed'
  | 'unreconciled';

export type DivergenceType =
  | 'amount_mismatch'
  | 'timing_gap'
  | 'key_mismatch'
  | 'e2eid_reuse'
  | 'partial_settlement'
  | 'over_settlement';

export type DivergenceSeverity = 'warning' | 'critical';

export interface Divergence {
  type: DivergenceType;
  expected: unknown;
  found: unknown;
  severity: DivergenceSeverity;
  description: string;
}

export interface ReconciliationResult {
  txid: string;
  e2eids: string[];
  totalSettled: number;
  expectedAmount: number;
  delta: number;
  status: ReconciliationStatus;
  divergences: Divergence[];
  reconciledAt: number;
}

export interface ReconcileInput {
  intent: ChargeIntent;
  liquidations: PixLiquidation[];
  links: TxidE2EIdLink[];
  decisions: AntiFraudDecision[];
}

export interface ReconcileOutput {
  result: ReconciliationResult;
  divergences: Divergence[];
}
