import { Component, inject, OnInit, signal, computed, effect } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe, CurrencyPipe } from '@angular/common';
import {
  IonButton,
  IonSpinner,
  AlertController,
  ToastController,
} from '@ionic/angular/standalone';
import { ChavePixService } from '../../application/chave-pix.service';
import { CobrancaService } from '../../application/cobranca.service';
import { PerfilService } from '../../application/perfil.service';
import {
  ChavePix,
  TIPO_CHAVE_LABELS,
  STATUS_CHAVE_LABELS,
} from '../../domain/chave-pix/chave-pix.model';
import { STATUS_COBRANCA_LABELS } from '../../domain/cobranca/cobranca.model';
import { BrCodeAdapter } from '../../infrastructure/brcode/brcode.adapter';
import {
  sanitizeMerchantName,
  sanitizeMerchantCity,
  gerarBrCodeRef,
} from '../../domain/cobranca/brcode.projection';
import { StatusClassPipe } from '../../shared/pipes/status-class.pipe';

@Component({
  selector: 'app-chaves-details',
  imports: [
    RouterLink,
    DatePipe,
    CurrencyPipe,
    IonButton,
    IonSpinner,
    StatusClassPipe,
  ],
  templateUrl: './chaves-details.html',
})
export class ChavesDetails implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly alertController = inject(AlertController);
  private readonly toastController = inject(ToastController);
  private readonly brCodeAdapter = inject(BrCodeAdapter);

  readonly chavePixService = inject(ChavePixService);
  readonly cobrancaService = inject(CobrancaService);
  readonly perfilService = inject(PerfilService);

  tipoLabels = TIPO_CHAVE_LABELS;
  statusLabels = STATUS_CHAVE_LABELS;
  statusCobrancaLabels = STATUS_COBRANCA_LABELS;

  private readonly chaveId = signal<string>('');
  acaoEmAndamento = signal(false);

  qrSvg = signal<string | null>(null);
  brcode = signal<string | null>(null);
  private qrChaveIdGerado: string | null = null;

  readonly chave = computed<ChavePix | null>(
    () => this.chavePixService.chaves().find((c) => c.id === this.chaveId()) ?? null
  );

  readonly cobrancasDessaChave = computed(() =>
    this.cobrancaService
      .cobrancas()
      .filter((c) => c.chavePixId === this.chaveId())
      .sort((a, b) => b.criadaEm - a.criadaEm)
  );

  constructor() {
    effect(() => {
      const c = this.chave();
      const perfil = this.perfilService.perfil();
      if (!c || !perfil) {
        this.qrSvg.set(null);
        this.brcode.set(null);
        this.qrChaveIdGerado = null;
        return;
      }
      if (this.qrChaveIdGerado === c.id) return;
      this.qrChaveIdGerado = c.id;
      void this.gerarQr(c.valor, perfil.merchantName, perfil.merchantCity);
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.chaveId.set(id);
    if (!this.chave()) {
      this.router.navigate(['/chaves']);
    }
  }

  private async gerarQr(
    pixKey: string,
    merchantName: string,
    merchantCity: string
  ): Promise<void> {
    try {
      const { brcode, qrSvg } = await this.brCodeAdapter.generate({
        pixKey,
        merchantName: sanitizeMerchantName(merchantName),
        merchantCity: sanitizeMerchantCity(merchantCity),
        transactionAmount: 0,
        referenceLabel: gerarBrCodeRef(),
      });
      this.brcode.set(brcode);
      this.qrSvg.set(qrSvg);
    } catch (e) {
      console.error('Falha ao gerar QR Code', e);
      this.qrSvg.set(null);
      this.brcode.set(null);
    }
  }

  async copiarBrCode(): Promise<void> {
    const code = this.brcode();
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      await this.showToast('BR Code copiado.', 'primary');
    } catch {
      await this.showToast('Falha ao copiar BR Code.', 'danger');
    }
  }

  async ativar(): Promise<void> {
    const c = this.chave();
    if (!c) return;
    this.acaoEmAndamento.set(true);
    try {
      await this.chavePixService.ativar(c.id);
    } catch (e: any) {
      await this.showToast(e?.message ?? 'Erro ao ativar chave.', 'danger');
    } finally {
      this.acaoEmAndamento.set(false);
    }
  }

  async arquivar(): Promise<void> {
    const c = this.chave();
    if (!c) return;
    const alert = await this.alertController.create({
      header: 'Arquivar chave',
      message: `Arquivar a chave "${c.valor}"? Ela não poderá ser reativada e não poderá ser excluída.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Arquivar',
          role: 'destructive',
          handler: () => this.executarArquivar(),
        },
      ],
    });
    await alert.present();
  }

  private async executarArquivar(): Promise<void> {
    const c = this.chave();
    if (!c) return;
    this.acaoEmAndamento.set(true);
    try {
      await this.chavePixService.arquivar(c.id);
      this.router.navigate(['/chaves']);
    } catch (e: any) {
      await this.showToast(e?.message ?? 'Erro ao arquivar chave.', 'danger');
    } finally {
      this.acaoEmAndamento.set(false);
    }
  }

  async remover(): Promise<void> {
    const c = this.chave();
    if (!c) return;
    const alert = await this.alertController.create({
      header: 'Remover chave',
      message: `Remover a chave "${c.valor}" definitivamente?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Remover',
          role: 'destructive',
          handler: () => this.executarRemover(),
        },
      ],
    });
    await alert.present();
  }

  private async executarRemover(): Promise<void> {
    const c = this.chave();
    if (!c) return;
    this.acaoEmAndamento.set(true);
    try {
      await this.chavePixService.remover(c.id);
      this.router.navigate(['/chaves']);
    } catch (e: any) {
      await this.showToast(e?.message ?? 'Erro ao remover chave.', 'danger');
    } finally {
      this.acaoEmAndamento.set(false);
    }
  }

  private async showToast(message: string, color: string = 'primary'): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2500,
      position: 'bottom',
      color,
    });
    await toast.present();
  }
}
