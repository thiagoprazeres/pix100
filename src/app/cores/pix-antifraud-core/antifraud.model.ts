export type RiskBand = 'low' | 'medium' | 'high' | 'critical';
export type AntiFraudVerdict = 'approved' | 'review' | 'rejected';

export interface RiskSignal {
  code: string;
  weight: number;
  description: string;
  evidence: string;
}

export interface RiskScore {
  total: number;
  band: RiskBand;
  signals: RiskSignal[];
  computedAt: number;
}

export interface Evidence {
  type:
    | 'e2eid_raw'
    | 'e2eid_parsed'
    | 'payer_ispb'
    | 'amount_delta'
    | 'timing_delta'
    | 'channel'
    | 'e2eid_reuse'
    | 'brcode_hash'
    | string;
  value: unknown;
  capturedAt: number;
}

export interface AntiFraudDecision {
  txid: string;
  e2eid: string;
  verdict: AntiFraudVerdict;
  score: RiskScore;
  evidences: Evidence[];
  decidedAt: number;
  ruleVersion: string;
}

export interface ParsedE2EId {
  raw: string;
  ispb: string;
  transactionDate: Date;
  sequence: string;
  valid: boolean;
}

export interface AnalysisInput {
  txid: string;
  e2eid: string;
  expectedAmount: number;
  settledAmount: number;
  paidAt: number;
  chargeCreatedAt: number;
  payerISPB: string;
  pixKey: string;
  userId: string;
  channel: 'manual' | 'api' | 'statement';
  knownE2EIds: string[];
  metadata?: Record<string, unknown>;
}

export interface AnalysisOutput {
  decision: AntiFraudDecision;
  score: RiskScore;
  signals: RiskSignal[];
  evidences: Evidence[];
}
