import {
  ChargeIntent,
  ChargeStatus,
  CreateChargeInput,
  CreateChargeOutput,
  LinkConfidence,
  PixLiquidation,
  RegisterLiquidationInput,
  RegisterLiquidationOutput,
  TxidE2EIdLink,
} from './charge.model';

export function createChargeIntent(input: CreateChargeInput): CreateChargeOutput {
  const now = Date.now();
  const txid = crypto.randomUUID().replace(/-/g, '').slice(0, 25);
  const intent: ChargeIntent = {
    txid,
    pixKey: input.pixKey,
    amount: input.amount,
    description: input.description,
    brcode: input.brcode,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    expiresAt: input.expiresAt,
    merchantSnapshot: {
      name: input.merchantName,
      city: input.merchantCity,
      pixKey: input.pixKey,
    },
  };
  return { intent };
}

export function registerPixLiquidation(
  input: RegisterLiquidationInput
): RegisterLiquidationOutput {
  const { intent } = input;
  const now = Date.now();

  const liquidation: PixLiquidation = {
    e2eid: input.e2eid,
    txid: intent.txid,
    amount: input.amount,
    paidAt: input.paidAt,
    payerISPB: input.payerISPB,
    payerName: input.payerName,
    payerDocument: input.payerDocument,
    source: input.source,
  };

  const link = linkTxidToE2EId(intent.txid, input.e2eid, 'medium');

  const updatedIntent: ChargeIntent = {
    ...intent,
    status: 'settled',
    updatedAt: now,
  };

  return { liquidation, link, updatedIntent };
}

export function linkTxidToE2EId(
  txid: string,
  e2eid: string,
  confidence: LinkConfidence
): TxidE2EIdLink {
  return {
    txid,
    e2eid,
    linkedAt: Date.now(),
    confidence,
    verified: false,
  };
}

export function getChargeStatus(intent: ChargeIntent): ChargeStatus {
  return intent.status;
}

export function upgradeLink(
  link: TxidE2EIdLink,
  confidence: LinkConfidence,
  verified = false
): TxidE2EIdLink {
  return { ...link, confidence, verified };
}
