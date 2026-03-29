import { Injectable } from '@angular/core';
import { createStaticPix } from 'pix-utils';
import QRCode from 'qrcode';

export interface BrCodeInput {
  pixKey: string;
  merchantName: string;
  merchantCity: string;
  transactionAmount: number;
  infoAdicional?: string;
}

export interface BrCodeOutput {
  brcode: string;
  qrSvg: string;
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
      isTransactionUnique: false,
    }).throwIfError();

    const brcode = payload.toBRCode();
    const svgString = await QRCode.toString(brcode, {
      type: 'svg',
      errorCorrectionLevel: 'L',
      margin: 1,
    });
    const qrSvg = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);

    return { brcode, qrSvg };
  }
}
