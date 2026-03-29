import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { CobrancaService } from '../../application/cobranca.service';
import { ConciliacaoService } from '../../application/conciliacao.service';
import { Cobranca, Pagador, STATUS_COBRANCA_LABELS, TIPO_CONTA_LABELS, TipoConta } from '../../domain/cobranca/cobranca.model';
import { EventoConciliacao, TIPO_EVENTO_LABELS } from '../../domain/conciliacao/evento-conciliacao.model';
import { transicaoValida } from '../../domain/cobranca/cobranca.rules';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { StatusClassPipe } from '../../shared/pipes/status-class.pipe';
import { IonButton, IonSpinner, ToastController, AlertController } from '@ionic/angular/standalone';
import { BancoService, BancoEntry } from '../../shared/services/banco.service';
import { gerarTicketBase64, base64ToFile, gerarPdf } from '../../domain/cobranca/ticket.projection';

@Component({
  selector: 'app-pix-details',
  imports: [CurrencyPipe, DatePipe, ReactiveFormsModule, StatusClassPipe, IonButton, IonSpinner],
  templateUrl: './pix-details.html',
})
export class PixDetails implements OnInit, OnDestroy {
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly cobrancaService = inject(CobrancaService);
  private readonly conciliacaoService = inject(ConciliacaoService);

  private readonly toastController = inject(ToastController);
  private readonly alertController = inject(AlertController);
  private readonly bancoService = inject(BancoService);
  private readonly destroy$ = new Subject<void>();

  bancosFiltrados = signal<BancoEntry[]>([]);

  cobranca = signal<Cobranca | null>(null);
  eventos = signal<EventoConciliacao[]>([]);
  conciliando = signal(false);
  registrandoPagador = signal(false);
  salvandoPagador = signal(false);

  statusLabels = STATUS_COBRANCA_LABELS;
  eventoLabels = TIPO_EVENTO_LABELS;
  tipoContaLabels = TIPO_CONTA_LABELS;
  tiposContaOpcoes = Object.keys(TIPO_CONTA_LABELS) as TipoConta[];

  readonly pagadorForm = new FormGroup({
    nome: new FormControl('', [Validators.required]),
    documento: new FormControl('', [Validators.required]),
    banco: new FormControl('', [Validators.required]),
    nomeBanco: new FormControl(''),
    agencia: new FormControl(''),
    conta: new FormControl(''),
    tipoConta: new FormControl<TipoConta | ''>(''),
    chavePix: new FormControl(''),
    endToEndId: new FormControl(''),
    paidAt: new FormControl(this.toDatetimeLocal(Date.now()), [Validators.required]),
  });

  async ngOnInit(): Promise<void> {
    const id = this.activatedRoute.snapshot.params['id'];
    const cobranca = await this.cobrancaService.buscarPorId(id);
    this.cobranca.set(cobranca ?? null);
    if (cobranca) {
      const eventos = await this.conciliacaoService.getEventos(cobranca.id);
      this.eventos.set(eventos);
    }
    await this.bancoService.carregar();
    this.configurarWatchersBanco();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private configurarWatchersBanco(): void {
    this.pagadorForm.get('endToEndId')!.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(v => {
        const ispb = this.bancoService.extrairISPBDoE2EId(v ?? '');
        if (!ispb) return;
        const banco = this.bancoService.resolverPorISPB(ispb);
        if (banco) {
          this.pagadorForm.patchValue({ banco: banco.ispb, nomeBanco: banco.nomeReduzido || banco.nome }, { emitEvent: false });
          this.bancosFiltrados.set([]);
        }
      });

    this.pagadorForm.get('banco')!.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(v => {
        const termo = v ?? '';
        const exato = this.bancoService.resolverPorISPB(termo);
        if (exato) {
          this.pagadorForm.patchValue({ nomeBanco: exato.nomeReduzido || exato.nome }, { emitEvent: false });
          this.bancosFiltrados.set([]);
        } else {
          this.bancosFiltrados.set(this.bancoService.buscar(termo));
        }
      });
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
    if (!c) return;
    const alert = await this.alertController.create({
      header: 'Cancelar cobrança',
      message: 'Esta ação não pode ser desfeita.',
      buttons: [
        { text: 'Voltar', role: 'cancel' },
        { text: 'Cancelar cobrança', role: 'destructive', handler: () => this.executarCancelamento() },
      ],
    });
    await alert.present();
  }

  private async executarCancelamento(): Promise<void> {
    const c = this.cobranca();
    if (!c) return;
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
      navigator.clipboard.writeText(brcode).then(async () => {
        const toast = await this.toastController.create({
          message: 'BR Code copiado!',
          duration: 2000,
          position: 'bottom',
          color: 'success',
        });
        await toast.present();
      });
    }
  }

  async shareBrcodeAndQrBase64(): Promise<void> {
    const c = this.cobranca();
    if (!c?.qrSvg && !c?.qrBase64) return;
    if (!navigator.canShare) {
      this.copyToClipboard();
      return;
    }
    try {
      const ticketBase64 = await gerarTicketBase64(c);
      const file = base64ToFile(ticketBase64, 'pix-ticket.png');
      this.copyToClipboard();
      navigator.share({ title: 'PIX Copia e Cola', text: c.brcode, files: [file] }).catch(console.error);
    } catch (err) {
      this.showToast('Falha ao gerar o ticket de cobrança.', 'danger');
    }
  }

  async salvarImagem(): Promise<void> {
    const c = this.cobranca();
    if (!c?.qrSvg && !c?.qrBase64) return;
    try {
      const ticketBase64 = await gerarTicketBase64(c);
      const link = document.createElement('a');
      link.href = ticketBase64;
      link.download = `pix-recibo-${c.brCodeRef}.png`;
      link.click();
    } catch (err) {
      this.showToast('Falha ao salvar a imagem.', 'danger');
    }
  }

  async baixarPdf(): Promise<void> {
    const c = this.cobranca();
    if (!c) return;
    try {
      await gerarPdf(c);
    } catch (err) {
      this.showToast('Falha ao gerar o PDF.', 'danger');
    }
  }

  private async showToast(message: string, color: string = 'primary'): Promise<void> {
    const toast = await this.toastController.create({ message, duration: 3000, position: 'bottom', color });
    await toast.present();
  }

  enviarWhatsApp(): void {
    const c = this.cobranca();
    if (!c) return;
    const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
    const texto = `Olá! Segue o PIX para pagamento no valor de *${fmt.format(c.valor)}*.\n\nCopie o código abaixo e cole no aplicativo do seu banco:\n\n${c.brcode}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
  }

  abrirFormPagador(): void {
    const pag = this.cobranca()?.pagador;
    this.pagadorForm.reset({
      nome: pag?.nome ?? '',
      documento: pag?.documento ?? '',
      banco: pag?.banco ?? '',
      nomeBanco: pag?.nomeBanco ?? '',
      agencia: pag?.agencia ?? '',
      conta: pag?.conta ?? '',
      tipoConta: pag?.tipoConta ?? '',
      chavePix: pag?.chavePix ?? '',
      endToEndId: pag?.endToEndId ?? '',
      paidAt: pag?.paidAt ? this.toDatetimeLocal(pag.paidAt) : this.toDatetimeLocal(Date.now()),
    });
    this.registrandoPagador.set(true);
  }

  cancelarFormPagador(): void {
    this.registrandoPagador.set(false);
  }

  async salvarPagador(): Promise<void> {
    if (this.pagadorForm.invalid || !this.cobranca()) return;
    const v = this.pagadorForm.value;
    const paidAt = v.paidAt ? new Date(v.paidAt).getTime() : Date.now();

    const pagador: Pagador = {
      nome: v.nome!.trim(),
      documento: v.documento!.trim(),
      banco: v.banco!.trim(),
      ...(v.nomeBanco?.trim() && { nomeBanco: v.nomeBanco.trim() }),
      ...(v.agencia?.trim() && { agencia: v.agencia.trim() }),
      ...(v.conta?.trim() && { conta: v.conta.trim() }),
      ...(v.tipoConta && { tipoConta: v.tipoConta as TipoConta }),
      ...(v.chavePix?.trim() && { chavePix: v.chavePix.trim() }),
      ...(v.endToEndId?.trim() && { endToEndId: v.endToEndId.trim() }),
      paidAt,
    };

    this.salvandoPagador.set(true);
    try {
      const atualizada = await this.cobrancaService.registrarPagador(this.cobranca()!.id, pagador);
      this.cobranca.set(atualizada);
      await this.recarregarEventos(atualizada.id);
      this.registrandoPagador.set(false);
    } catch (e: any) {
      this.showToast(e?.message ?? 'Erro ao registrar pagador.', 'danger');
    } finally {
      this.salvandoPagador.set(false);
    }
  }

  private toDatetimeLocal(ts: number): string {
    const d = new Date(ts);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}
