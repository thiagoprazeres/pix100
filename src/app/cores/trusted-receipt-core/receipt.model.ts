import { AntiFraudDecision, Evidence, RiskScore } from '../pix-antifraud-core';

export type TrustLevel = 'trusted' | 'conditional' | 'untrusted';

export interface TrustedReceipt {
  receiptId: string;
  txid: string;
  e2eid: string;
  amount: number;
  normalizedPaidAt: number;
  payerISPB: string;
  payerInstitutionName: string;
  brcode: string;
  brcodeHash: string;
  brcodeConsistent: boolean;
  score: RiskScore;
  decision: AntiFraudDecision;
  trustLevel: TrustLevel;
  evidences: Evidence[];
  fingerprint: string;
  issuedAt: number;
}

export interface BuildReceiptInput {
  txid: string;
  e2eid: string;
  amount: number;
  paidAt: number;
  payerISPB: string;
  payerInstitutionName: string;
  brcode: string;
  brcodeConsistent?: boolean;
  decision: AntiFraudDecision;
  evidences: Evidence[];
}

export interface BuildReceiptOutput {
  receipt: TrustedReceipt;
}
