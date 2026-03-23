import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PixService } from '../../services/pix-service';
import { PerfilService } from '../../services/perfil-service';
import { CurrencyPipe, DatePipe } from '@angular/common';

@Component({
  selector: 'app-pix-details',
  imports: [CurrencyPipe, DatePipe],
  templateUrl: './pix-details.html',
})
export class PixDetails {
  txid = signal('');
  showToast = signal(false);

  private activatedRoute = inject(ActivatedRoute);
  private readonly pixService = inject(PixService);
  private readonly perfilService = inject(PerfilService);
  pix = signal<any | null>(null);

  constructor() {
    this.activatedRoute.params.subscribe((params) => {
      this.txid.set(params['txid']);
      this.pix.set(this.pixService.buscarPorTxid(params['txid']) || null);
      console.log('PIX details:', this.pix());
    });
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
          this.showToast.set(true);
          setTimeout(() => this.showToast.set(false), 3000);
        })
        .catch((err) => {
          console.error('Falha ao copiar: ', err);
          alert('Falha ao copiar o código PIX. Por favor, tente novamente.');
        });
    }
  }

  async shareBrcodeAndQrBase64() {
    if (!navigator.canShare) {
      alert('O seu dispositivo não suporta Web Share API.');
      return;
    }

    // Copia preventivamente o código para o clipboard (Fallback)
    this.copyToClipboard();

    const pix = this.pix();
    if (!pix || !pix.qrBase64) return;

    try {
      const perfil = this.perfilService.perfil();
      const mName = perfil ? perfil.merchantName : 'Recebedor';
      const mCity = perfil ? perfil.merchantCity : '';

      const ticketBase64 = await this.gerarTicketBase64(pix, mName, mCity);
      const file = this.base64ToFile(ticketBase64, 'pix-ticket.png', 'image/png');

      navigator
        .share({
          title: 'PIX Copia e Cola',
          text: pix.brcode,
          files: [file],
        })
        .catch(console.error);
    } catch (err) {
      console.error('Erro ao gerar e compartilhar recibo:', err);
      alert('Falha ao gerar o ticket de cobrança.');
    }
  }

  gerarTicketBase64(pix: any, merchantName: string, merchantCity: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 800;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject('Sem contexto 2D');

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, 140);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 38px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PAGAMENTO PIX', canvas.width / 2, 85);

      ctx.fillStyle = '#334155';
      ctx.font = 'bold 30px sans-serif';
      ctx.fillText(merchantName.toUpperCase(), canvas.width / 2, 200);

      if (merchantCity) {
        ctx.fillStyle = '#64748b';
        ctx.font = '22px sans-serif';
        ctx.fillText(merchantCity.toUpperCase(), canvas.width / 2, 235);
      }

      const formatador = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
      const valorFormatado = formatador.format(pix.amount);
      ctx.fillStyle = '#16a34a';
      ctx.font = '900 68px sans-serif';
      ctx.fillText(valorFormatado, canvas.width / 2, 310);

      if (pix.infoAdicional) {
        ctx.fillStyle = '#64748b';
        ctx.font = 'italic 24px sans-serif';
        ctx.fillText(`"${pix.infoAdicional}"`, canvas.width / 2, 355);
      }

      const img = new Image();
      img.onload = () => {
        const qrSize = 340;
        const qrX = (canvas.width - qrSize) / 2;
        const qrY = 380;

        ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '16px sans-serif';
        ctx.fillText('Gerado rapidamente com PIX100', canvas.width / 2, canvas.height - 40);
        ctx.fillText(`TXID: ${pix.txid}`, canvas.width / 2, canvas.height - 20);

        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = pix.qrBase64;
    });
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
