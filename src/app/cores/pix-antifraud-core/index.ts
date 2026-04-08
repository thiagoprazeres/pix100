export type {
  RiskBand,
  AntiFraudVerdict,
  RiskSignal,
  RiskScore,
  Evidence,
  AntiFraudDecision,
  ParsedE2EId,
  AnalysisInput,
  AnalysisOutput,
} from './antifraud.model';

export {
  analyzePixTransaction,
  evaluateRiskSignals,
  buildEvidence,
} from './antifraud.api';

export {
  RULE_VERSION,
  parseE2EId,
  ruleE2EIdFormat,
  ruleTemporalCoherence,
  ruleAmountMismatch,
  ruleE2EIdReuse,
  ruleAtypicalHour,
  ruleStaleCharge,
} from './antifraud.rules';
