import {
  AnalysisInput,
  AnalysisOutput,
  AntiFraudDecision,
  AntiFraudVerdict,
  Evidence,
  RiskBand,
  RiskScore,
  RiskSignal,
} from './antifraud.model';
import {
  RULE_VERSION,
  parseE2EId,
  ruleAmountMismatch,
  ruleAtypicalHour,
  ruleE2EIdFormat,
  ruleE2EIdReuse,
  ruleStaleCharge,
  ruleTemporalCoherence,
} from './antifraud.rules';

const SCORE_MAX = 1000;

const BAND_MIN: Record<RiskBand, number> = {
  low: 0,
  medium: 151,
  high: 351,
  critical: 601,
};

function toBand(total: number): RiskBand {
  if (total >= BAND_MIN.critical) return 'critical';
  if (total >= BAND_MIN.high)     return 'high';
  if (total >= BAND_MIN.medium)   return 'medium';
  return 'low';
}

function toVerdict(band: RiskBand): AntiFraudVerdict {
  if (band === 'critical') return 'rejected';
  if (band === 'high')     return 'review';
  return 'approved';
}

export function buildEvidence(type: string, value: unknown): Evidence {
  return { type, value, capturedAt: Date.now() };
}

export function evaluateRiskSignals(signals: RiskSignal[]): RiskScore {
  const raw   = signals.reduce((sum, s) => sum + s.weight, 0);
  const total = Math.min(raw, SCORE_MAX);
  return {
    total,
    band: toBand(total),
    signals,
    computedAt: Date.now(),
  };
}

function makeDecision(
  txid: string,
  e2eid: string,
  signals: RiskSignal[],
  evidences: Evidence[]
): AntiFraudDecision {
  const score   = evaluateRiskSignals(signals);
  const verdict = toVerdict(score.band);
  return {
    txid,
    e2eid,
    verdict,
    score,
    evidences,
    decidedAt: Date.now(),
    ruleVersion: RULE_VERSION,
  };
}

export function analyzePixTransaction(input: AnalysisInput): AnalysisOutput {
  const signals: RiskSignal[] = [];
  const evidences: Evidence[] = [
    buildEvidence('e2eid_raw',     input.e2eid),
    buildEvidence('payer_ispb',    input.payerISPB),
    buildEvidence('amount_delta',  input.expectedAmount - input.settledAmount),
    buildEvidence('timing_delta',  input.paidAt - input.chargeCreatedAt),
    buildEvidence('channel',       input.channel),
  ];

  const formatSignal = ruleE2EIdFormat(input.e2eid);
  if (formatSignal) {
    signals.push(formatSignal);
    const decision = makeDecision(input.txid, input.e2eid, signals, evidences);
    return { decision, score: decision.score, signals, evidences };
  }

  const parsed = parseE2EId(input.e2eid);
  evidences.push(buildEvidence('e2eid_parsed', parsed));

  const temporalSignal = ruleTemporalCoherence(parsed, input.paidAt);
  if (temporalSignal) signals.push(temporalSignal);

  const amountSignal = ruleAmountMismatch(input.expectedAmount, input.settledAmount);
  if (amountSignal) signals.push(amountSignal);

  const reuseSignal = ruleE2EIdReuse(input.e2eid, input.knownE2EIds);
  if (reuseSignal) signals.push(reuseSignal);

  const hourSignal = ruleAtypicalHour(input.paidAt);
  if (hourSignal) signals.push(hourSignal);

  const staleSignal = ruleStaleCharge(input.chargeCreatedAt, input.paidAt);
  if (staleSignal) signals.push(staleSignal);

  const decision = makeDecision(input.txid, input.e2eid, signals, evidences);
  return { decision, score: decision.score, signals, evidences };
}
