import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CobrancaService } from '../../application/cobranca.service';
import { ConciliacaoService } from '../../application/conciliacao.service';
import { Cobranca, STATUS_COBRANCA_LABELS } from '../../domain/cobranca/cobranca.model';
import { EventoConciliacao, TIPO_EVENTO_LABELS } from '../../domain/conciliacao/evento-conciliacao.model';
import { transicaoValida } from '../../domain/cobranca/cobranca.rules';
import { CurrencyPipe, DatePipe } from '@angular/common';

@Component({
  selector: 'app-pix-details',
  imports: [CurrencyPipe, DatePipe],
  templateUrl: './pix-details.html',
})
export class PixDetails implements OnInit {
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly cobrancaService = inject(CobrancaService);
  private readonly conciliacaoService = inject(ConciliacaoService);

  cobranca = signal<Cobranca | null>(null);
  eventos = signal<EventoConciliacao[]>([]);
  showToast = signal(false);
  conciliando = signal(false);

  statusLabels = STATUS_COBRANCA_LABELS;
  eventoLabels = TIPO_EVENTO_LABELS;

  async ngOnInit(): Promise<void> {
    const id = this.activatedRoute.snapshot.params['id'];
    const cobranca = await this.cobrancaService.buscarPorId(id);
    this.cobranca.set(cobranca ?? null);
    if (cobranca) {
      const eventos = await this.conciliacaoService.getEventos(cobranca.id);
      this.eventos.set(eventos);
    }
  }

  get podeConfirmar(): boolean {
    const c = this.cobranca();
    return !!c && transicaoValida(c.statusAtual, 'paga');
  }

  get podeDesconfirmar(): boolean {
    const c = this.cobranca();
    return !!c && transicaoValida(c.statusAtual, 'pendente');
  }

  get podeCancelar(): boolean {
    const c = this.cobranca();
    return !!c && transicaoValida(c.statusAtual, 'cancelada');
  }

  async confirmar(): Promise<void> {
    const c = this.cobranca();
    if (!c) return;
    this.conciliando.set(true);
    try {
      const atualizada = await this.conciliacaoService.aplicar({
        cobranca: c,
        tipo: 'confirmada_manualmente',
        origem: 'manual',
      });
      this.cobranca.set(atualizada);
      await this.recarregarEventos(atualizada.id);
    } finally {
      this.conciliando.set(false);
    }
  }

  async desconfirmar(): Promise<void> {
    const c = this.cobranca();
    if (!c) return;
    this.conciliando.set(true);
    try {
      const atualizada = await this.conciliacaoService.aplicar({
        cobranca: c,
        tipo: 'desconfirmada',
        origem: 'manual',
      });
      this.cobranca.set(atualizada);
      await this.recarregarEventos(atualizada.id);
    } finally {
      this.conciliando.set(false);
    }
  }

  async cancelar(): Promise<void> {
    const c = this.cobranca();
    if (!c || !confirm('Cancelar esta cobrança?')) return;
    this.conciliando.set(true);
    try {
      const atualizada = await this.conciliacaoService.aplicar({
        cobranca: c,
        tipo: 'cancelada',
        origem: 'manual',
      });
      this.cobranca.set(atualizada);
      await this.recarregarEventos(atualizada.id);
    } finally {
      this.conciliando.set(false);
    }
  }

  private async recarregarEventos(cobrancaId: string): Promise<void> {
    const eventos = await this.conciliacaoService.getEventos(cobrancaId);
    this.eventos.set(eventos);
  }

  goBack(): void {
    window.history.back();
  }

  copyToClipboard(): void {
    const brcode = this.cobranca()?.brcode;
    if (brcode) {
      navigator.clipboard.writeText(brcode).then(() => {
        this.showToast.set(true);
        setTimeout(() => this.showToast.set(false), 3000);
      });
    }
  }

  async shareBrcodeAndQrBase64(): Promise<void> {
    if (!navigator.canShare) {
      alert('O seu dispositivo não suporta Web Share API.');
      return;
    }
    this.copyToClipboard();
    const c = this.cobranca();
    if (!c?.qrBase64) return;
    try {
      const ticketBase64 = await this.gerarTicketBase64(c);
      const file = this.base64ToFile(ticketBase64, 'pix-ticket.png');
      navigator.share({ title: 'PIX Copia e Cola', text: c.brcode, files: [file] }).catch(console.error);
    } catch (err) {
      alert('Falha ao gerar o ticket de cobrança.');
    }
  }

  async salvarImagem(): Promise<void> {
    const c = this.cobranca();
    if (!c?.qrBase64) return;
    try {
      const ticketBase64 = await this.gerarTicketBase64(c);
      const link = document.createElement('a');
      link.href = ticketBase64;
      link.download = `pix-recibo-${c.brCodeRef}.png`;
      link.click();
    } catch (err) {
      alert('Falha ao salvar a imagem.');
    }
  }

  enviarWhatsApp(): void {
    const c = this.cobranca();
    if (!c) return;
    const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
    const texto = `Olá! Segue o PIX para pagamento no valor de *${fmt.format(c.valor)}*.\n\nCopie o código abaixo e cole no aplicativo do seu banco:\n\n${c.brcode}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
  }

  private gerarTicketBase64(c: Cobranca): Promise<string> {
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
      ctx.fillText(c.snapshot.merchantName.toUpperCase(), canvas.width / 2, 200);
      ctx.fillStyle = '#64748b';
      ctx.font = '22px sans-serif';
      ctx.fillText(c.snapshot.merchantCity, canvas.width / 2, 235);
      const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
      ctx.fillStyle = '#16a34a';
      ctx.font = '900 68px sans-serif';
      ctx.fillText(fmt.format(c.valor), canvas.width / 2, 310);
      if (c.descricao) {
        ctx.fillStyle = '#64748b';
        ctx.font = 'italic 24px sans-serif';
        ctx.fillText(`"${c.descricao}"`, canvas.width / 2, 355);
      }
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 130, 380, 340, 340);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '16px sans-serif';
        ctx.fillText('Gerado com Origem100', canvas.width / 2, canvas.height - 40);
        ctx.fillText(`Ref: ${c.brCodeRef}`, canvas.width / 2, canvas.height - 20);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = c.qrBase64!;
    });
  }

  private base64ToFile(base64: string, filename: string): File {
    const arr = base64.split(',');
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8 = new Uint8Array(n);
    while (n--) u8[n] = bstr.charCodeAt(n);
    return new File([u8], filename, { type: 'image/png' });
  }

  statusClass(c: Cobranca): string {
    switch (c.statusAtual) {
      case 'paga': return 'badge-success';
      case 'expirada': return 'badge-warning';
      case 'cancelada': return 'badge-error';
      default: return 'badge-ghost';
    }
  }
}
