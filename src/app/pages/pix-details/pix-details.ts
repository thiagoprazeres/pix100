import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PixService } from '../../services/pix-service';
import { CurrencyPipe, DatePipe } from '@angular/common';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-pix-details',
  imports: [CurrencyPipe, DatePipe],
  templateUrl: './pix-details.html',
})
export class PixDetails {
  txid = signal('');

  private activatedRoute = inject(ActivatedRoute);
  private readonly pixService = inject(PixService);
  pix = signal<any | null>(null);

  constructor() {
    this.activatedRoute.params.subscribe((params) => {
      this.txid.set(params['txid']);
      this.pix.set(this.pixService.buscarPorTxid(params['txid']) || null);
      console.log('PIX details:', this.pix());
    });
  }

  async generateQRCode() {
    if (this.pix()) {
      try {
        const dataUrl = await QRCode.toDataURL(this.pix()!.payload.toBRCode());
        return dataUrl;
      } catch (error) {
        console.error('Erro ao gerar QR Code:', error);
        return '';
      }
    }
    return '';
  }

  goBack() {
    window.history.back();
  }

  copyToClipboard() {
    const brcode = this.pix()?.brcode;
    if (brcode) {
      navigator.clipboard
        .writeText(brcode)
        .then(() => {
          alert('Código PIX copiado para a área de transferência!');
        })
        .catch((err) => {
          console.error('Falha ao copiar: ', err);
          alert('Falha ao copiar o código PIX. Por favor, tente novamente.');
        });
    }
  }

  shareBrcodeAndQrBase64() {
    if (!navigator.canShare) {
      alert('O seu dispositivo não suporta Web Share API.');
      return;
    }
    const pix = this.pix();
    // Converte o base64 em File
    const file = this.base64ToFile(pix.qrBase64, 'pix.png', 'image/png');
    if (pix && pix.qrBase64) {
      navigator
        .share({
          title: 'PIX Copia e Cola',
          text: pix.brcode,
          files: [file],
        })
        .catch(console.error);
    }
  }

  base64ToFile(base64: string, filename: string, mime = 'image/png'): File {
    const arr = base64.split(',');
    const bstr = atob(arr[1]);
    let length = bstr.length;
    const u8arr = new Uint8Array(length);

    while (length--) {
      u8arr[length] = bstr.charCodeAt(length);
    }

    return new File([u8arr], filename, { type: mime });
  }
}
