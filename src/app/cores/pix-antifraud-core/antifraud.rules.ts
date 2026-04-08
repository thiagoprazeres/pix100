import { ParsedE2EId, RiskSignal } from './antifraud.model';

export const RULE_VERSION = '1.0.0';

const E2EID_REGEX = /^E\d{20}[A-Za-z0-9]{11}$/;
const TEMPORAL_TOLERANCE_MS = 24 * 60 * 60 * 1000;
const AMOUNT_TOLERANCE_RATIO = 0.01;
const STALE_CHARGE_DAYS = 7;

export function parseE2EId(e2eid: string): ParsedE2EId {
  const v = e2eid.trim();
  if (!E2EID_REGEX.test(v)) {
    return { raw: v, ispb: '', transactionDate: new Date(NaN), sequence: '', valid: false };
  }
  const ispb = v.slice(1, 9);
  const datePart = v.slice(9, 17);
  const timePart = v.slice(17, 21);
  const sequence = v.slice(21);
  const year   = parseInt(datePart.slice(0, 4), 10);
  const month  = parseInt(datePart.slice(4, 6), 10) - 1;
  const day    = parseInt(datePart.slice(6, 8), 10);
  const hour   = parseInt(timePart.slice(0, 2), 10);
  const minute = parseInt(timePart.slice(2, 4), 10);
  const transactionDate = new Date(Date.UTC(year, month, day, hour, minute));
  return { raw: v, ispb, transactionDate, sequence, valid: !isNaN(transactionDate.getTime()) };
}

export function ruleE2EIdFormat(e2eid: string): RiskSignal | null {
  if (!E2EID_REGEX.test(e2eid.trim())) {
    return {
      code: 'E2EID_FORMAT_INVALID',
      weight: 200,
      description: 'E2EId com formato inválido',
      evidence: e2eid,
    };
  }
  return null;
}

export function ruleTemporalCoherence(parsed: ParsedE2EId, paidAt: number): RiskSignal | null {
  if (!parsed.valid) return null;
  const diffMs = Math.abs(paidAt - parsed.transactionDate.getTime());
  if (diffMs > TEMPORAL_TOLERANCE_MS) {
    const diffH = Math.round(diffMs / 3_600_000);
    return {
      code: 'E2EID_TEMPORAL_MISMATCH',
      weight: 150,
      description: 'Data embutida no E2EId diverge da data de pagamento informada',
      evidence: `e2eid_date=${parsed.transactionDate.toISOString()} paid_at=${new Date(paidAt).toISOString()} diff=${diffH}h`,
    };
  }
  return null;
}

export function ruleAmountMismatch(
  expectedAmount: number,
  settledAmount: number
): RiskSignal | null {
  if (expectedAmount === 0) return null;
  const delta = Math.abs(expectedAmount - settledAmount);
  const ratio = delta / expectedAmount;
  if (ratio > AMOUNT_TOLERANCE_RATIO) {
    return {
      code: 'AMOUNT_MISMATCH',
      weight: 200,
      description: 'Valor liquidado diverge do valor esperado',
      evidence: `expected=${expectedAmount} settled=${settledAmount} delta=${delta} ratio=${(ratio * 100).toFixed(2)}%`,
    };
  }
  return null;
}

export function ruleE2EIdReuse(e2eid: string, knownE2EIds: string[]): RiskSignal | null {
  const trimmed = e2eid.trim();
  const count = knownE2EIds.filter(k => k === trimmed).length;
  if (count > 0) {
    return {
      code: 'E2EID_REUSE',
      weight: 400,
      description: 'E2EId já utilizado em outra transação. Possível reutilização de comprovante.',
      evidence: `e2eid=${trimmed} occurrences=${count}`,
    };
  }
  return null;
}

export function ruleAtypicalHour(paidAt: number): RiskSignal | null {
  const hour = new Date(paidAt).getHours();
  if (hour >= 0 && hour < 6) {
    return {
      code: 'ATYPICAL_HOUR',
      weight: 50,
      description: 'Pagamento em horário atípico (00h–06h)',
      evidence: `hour=${hour}`,
    };
  }
  return null;
}

export function ruleStaleCharge(chargeCreatedAt: number, paidAt: number): RiskSignal | null {
  const ageDays = (paidAt - chargeCreatedAt) / (1_000 * 60 * 60 * 24);
  if (ageDays > STALE_CHARGE_DAYS) {
    return {
      code: 'STALE_CHARGE',
      weight: 100,
      description: `Cobrança paga ${Math.floor(ageDays)} dias após a criação`,
      evidence: `created_at=${new Date(chargeCreatedAt).toISOString()} paid_at=${new Date(paidAt).toISOString()} age_days=${Math.floor(ageDays)}`,
    };
  }
  return null;
}
