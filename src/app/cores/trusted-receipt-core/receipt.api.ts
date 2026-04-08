import { AntiFraudDecision, AntiFraudVerdict } from '../pix-antifraud-core';
import { BuildReceiptInput, BuildReceiptOutput, TrustLevel, TrustedReceipt } from './receipt.model';

async function sha256hex(data: string): Promise<string> {
  const buf = new TextEncoder().encode(data);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function fingerprintPayload(r: {
  receiptId: string;
  txid: string;
  e2eid: string;
  amount: number;
  normalizedPaidAt: number;
  brcodeHash: string;
  scoreTotal: number;
}): string {
  return JSON.stringify(r, Object.keys(r).sort() as (keyof typeof r)[]);
}

const VERDICT_TO_TRUST: Record<AntiFraudVerdict, TrustLevel> = {
  approved:  'trusted',
  review:    'conditional',
  rejected:  'untrusted',
};

export function classifyTrustLevel(decision: AntiFraudDecision): TrustLevel {
  return VERDICT_TO_TRUST[decision.verdict];
}

export async function buildTrustedReceipt(
  input: BuildReceiptInput
): Promise<BuildReceiptOutput> {
  const now       = Date.now();
  const receiptId = crypto.randomUUID();
  const brcodeHash = await sha256hex(input.brcode);
  const trustLevel = classifyTrustLevel(input.decision);

  const payload = fingerprintPayload({
    receiptId,
    txid:             input.txid,
    e2eid:            input.e2eid,
    amount:           input.amount,
    normalizedPaidAt: input.paidAt,
    brcodeHash,
    scoreTotal:       input.decision.score.total,
  });
  const fingerprint = await sha256hex(payload);

  const receipt: TrustedReceipt = {
    receiptId,
    txid:                input.txid,
    e2eid:               input.e2eid,
    amount:              input.amount,
    normalizedPaidAt:    input.paidAt,
    payerISPB:           input.payerISPB,
    payerInstitutionName: input.payerInstitutionName,
    brcode:              input.brcode,
    brcodeHash,
    brcodeConsistent:    input.brcodeConsistent ?? true,
    score:               input.decision.score,
    decision:            input.decision,
    trustLevel,
    evidences:           input.evidences,
    fingerprint,
    issuedAt:            now,
  };

  return { receipt };
}

export async function verifyReceiptIntegrity(receipt: TrustedReceipt): Promise<boolean> {
  const payload = fingerprintPayload({
    receiptId:        receipt.receiptId,
    txid:             receipt.txid,
    e2eid:            receipt.e2eid,
    amount:           receipt.amount,
    normalizedPaidAt: receipt.normalizedPaidAt,
    brcodeHash:       receipt.brcodeHash,
    scoreTotal:       receipt.decision.score.total,
  });
  const expected = await sha256hex(payload);
  return expected === receipt.fingerprint;
}
