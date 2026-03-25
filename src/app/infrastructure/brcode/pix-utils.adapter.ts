import { Injectable } from '@angular/core';
import { createStaticPix } from 'pix-utils';

export interface BrCodeInput {
  pixKey: string;
  merchantName: string;
  merchantCity: string;
  transactionAmount: number;
  infoAdicional?: string;
  txid: string;
}

export interface BrCodeOutput {
  brcode: string;
  qrBase64: string;
}

@Injectable({ providedIn: 'root' })
export class PixUtilsAdapter {
  async generate(input: BrCodeInput): Promise<BrCodeOutput> {
    const payload = createStaticPix({
      merchantName: input.merchantName,
      merchantCity: input.merchantCity,
      pixKey: input.pixKey,
      infoAdicional: input.infoAdicional,
      transactionAmount: input.transactionAmount,
      txid: input.txid,
      isTransactionUnique: true,
    }).throwIfError();

    const qrBase64 = await payload.toImage();

    return {
      brcode: payload.toBRCode(),
      qrBase64,
    };
  }
}
