import { Injectable } from '@angular/core';
import { generateStaticBrCode } from '@thiagoprazeres/pix-static-brcode';
import QRCode from 'qrcode';

export interface BrCodeInput {
  pixKey: string;
  merchantName: string;
  merchantCity: string;
  transactionAmount: number;
  referenceLabel: string;
  infoAdicional?: string;
}

export interface BrCodeOutput {
  brcode: string;
  qrSvg: string;
}

@Injectable({ providedIn: 'root' })
export class PixUtilsAdapter {
  async generate(input: BrCodeInput): Promise<BrCodeOutput> {
    const brcode = generateStaticBrCode({
      pixKey: input.pixKey,
      receiverName: input.merchantName,
      receiverCity: input.merchantCity,
      referenceLabel: input.referenceLabel,
      amount: input.transactionAmount > 0 ? input.transactionAmount : undefined,
      description: input.infoAdicional,
    });

    const svgString = await QRCode.toString(brcode, {
      type: 'svg',
      errorCorrectionLevel: 'L',
      margin: 1,
    });
    const qrSvg = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);

    return { brcode, qrSvg };
  }
}
