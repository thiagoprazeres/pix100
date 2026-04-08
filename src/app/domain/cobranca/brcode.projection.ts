import { projectReceiverName, projectCity, buildBrCodeRef } from '@thiagoprazeres/pix-static-brcode';

export { projectReceiverName as sanitizeMerchantName, projectCity as sanitizeMerchantCity };

export function sanitizeInfoAdicional(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .trim()
    .slice(0, 72);
}

export function gerarBrCodeRef(): string {
  return buildBrCodeRef(crypto.randomUUID());
}
