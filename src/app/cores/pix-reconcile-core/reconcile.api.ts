import { AntiFraudDecision } from '../pix-antifraud-core';
import { ChargeIntent, PixLiquidation } from '../pix-charge-core';
import {
  Divergence,
  ReconcileInput,
  ReconcileOutput,
  ReconciliationResult,
  ReconciliationStatus,
} from './reconcile.model';

const AMOUNT_TOLERANCE_RATIO = 0.01;
const TIMING_GAP_DAYS        = 30;

export function detectDivergences(
  intent: ChargeIntent,
  liquidations: PixLiquidation[]
): Divergence[] {
  const divergences: Divergence[] = [];
  const totalSettled = liquidations.reduce((sum, l) => sum + l.amount, 0);

  if (totalSettled === 0) return divergences;

  const delta = totalSettled - intent.amount;
  const ratio = intent.amount > 0 ? Math.abs(delta) / intent.amount : 0;

  if (delta < 0 && ratio > AMOUNT_TOLERANCE_RATIO) {
    divergences.push({
      type: 'partial_settlement',
      expected: intent.amount,
      found: totalSettled,
      severity: 'warning',
      description: `Valor liquidado (${totalSettled}) menor que o esperado (${intent.amount})`,
    });
  }

  if (delta > 0 && ratio > AMOUNT_TOLERANCE_RATIO) {
    divergences.push({
      type: 'over_settlement',
      expected: intent.amount,
      found: totalSettled,
      severity: 'warning',
      description: `Valor liquidado (${totalSettled}) maior que o esperado (${intent.amount})`,
    });
  }

  for (const liq of liquidations) {
    const ageDays = (liq.paidAt - intent.createdAt) / (1_000 * 60 * 60 * 24);
    if (ageDays > TIMING_GAP_DAYS) {
      divergences.push({
        type: 'timing_gap',
        expected: `≤ ${TIMING_GAP_DAYS} dias`,
        found: `${Math.floor(ageDays)} dias`,
        severity: 'warning',
        description: `E2EId ${liq.e2eid} registrado ${Math.floor(ageDays)} dias após criação da cobrança`,
      });
    }
  }

  return divergences;
}

function appendRiskDivergences(
  divergences: Divergence[],
  decisions: AntiFraudDecision[]
): void {
  for (const dec of decisions) {
    for (const sig of dec.score.signals) {
      if (sig.code === 'E2EID_REUSE') {
        divergences.push({
          type: 'e2eid_reuse',
          expected: 'E2EId único por transação',
          found: dec.e2eid,
          severity: 'critical',
          description: `E2EId ${dec.e2eid} sinalizado como reutilizado pelo motor de risco`,
        });
      }
    }
  }
}

function computeStatus(
  expectedAmount: number,
  totalSettled: number,
  decisions: AntiFraudDecision[]
): ReconciliationStatus {
  if (decisions.some(d => d.verdict === 'rejected')) return 'disputed';
  if (totalSettled === 0) return 'unreconciled';

  const delta = totalSettled - expectedAmount;
  const ratio = expectedAmount > 0 ? Math.abs(delta) / expectedAmount : 0;

  if (ratio <= AMOUNT_TOLERANCE_RATIO) return 'matched';
  if (delta < 0) return 'partial';
  return 'over';
}

export function reconcilePixSettlement(input: ReconcileInput): ReconcileOutput {
  const { intent, liquidations, decisions } = input;

  const e2eids       = liquidations.map(l => l.e2eid);
  const totalSettled = liquidations.reduce((sum, l) => sum + l.amount, 0);
  const divergences  = detectDivergences(intent, liquidations);
  appendRiskDivergences(divergences, decisions);

  const status = computeStatus(intent.amount, totalSettled, decisions);

  const result: ReconciliationResult = {
    txid: intent.txid,
    e2eids,
    totalSettled,
    expectedAmount: intent.amount,
    delta: totalSettled - intent.amount,
    status,
    divergences,
    reconciledAt: Date.now(),
  };

  return { result, divergences };
}

export function closeReconciliation(
  result: ReconciliationResult,
  finalStatus: ReconciliationStatus
): ReconciliationResult {
  return { ...result, status: finalStatus, reconciledAt: Date.now() };
}
