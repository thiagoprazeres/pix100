import { Component, inject, signal, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { MaskitoDirective } from '@maskito/angular';
import { MaskitoOptions, MaskitoPreprocessor } from '@maskito/core';
import { maskitoNumberOptionsGenerator, maskitoParseNumber } from '@maskito/kit';
import { PerfilService } from '../../application/perfil.service';
import { ChavePixService } from '../../application/chave-pix.service';
import { CobrancaService } from '../../application/cobranca.service';
import { Router, RouterLink } from '@angular/router';
import { sanitizeInfoAdicional } from '../../domain/cobranca/brcode.projection';
import { IonButton, IonToggle, IonSpinner } from '@ionic/angular/standalone';

@Component({
  selector: 'app-pix',
  imports: [ReactiveFormsModule, MaskitoDirective, RouterLink, IonButton, IonToggle, IonSpinner],
  templateUrl: './pix.html',
})
export class Pix {
  readonly perfilService = inject(PerfilService);
  readonly chavePixService = inject(ChavePixService);
  private readonly cobrancaService = inject(CobrancaService);
  private readonly router = inject(Router);

  gerando = signal(false);
  erro = signal<string | null>(null);
  mostrarVencimento = signal(false);

  pixForm = new FormGroup({
    transactionAmount: new FormControl<string | null>(null, [Validators.required]),
    infoAdicional: new FormControl<string>(''),
    vencimento: new FormControl<string>(''),
  });

  private readonly _infoAdicional = toSignal(
    this.pixForm.controls.infoAdicional.valueChanges,
    { initialValue: '' }
  );

  readonly descricaoSanitizada = computed(() => {
    const raw = this._infoAdicional() ?? '';
    if (!raw) return '';
    const sanitized = sanitizeInfoAdicional(raw);
    return sanitized !== raw ? sanitized : '';
  });

  readonly maskValor: MaskitoOptions = (() => {
    const base = maskitoNumberOptionsGenerator({
      min: 0,
      maximumFractionDigits: 2,
      prefix: 'R$ ',
      minimumFractionDigits: 2,
      decimalSeparator: ',',
      thousandSeparator: '.',
    });

    const cashRegister: MaskitoPreprocessor = ({ elementState, data }, actionType) => {
      const digits = elementState.value.replace(/\D/g, '');
      const currentCents = parseInt(digits || '0', 10);

      if (actionType === 'deleteBackward') {
        const newCents = Math.floor(currentCents / 10);
        const r = Math.floor(newCents / 100);
        const c = newCents % 100;
        return {
          elementState: { value: '', selection: [0, 0] as [number, number] },
          data: `${r},${String(c).padStart(2, '0')}`,
        };
      }

      if (actionType !== 'insert' || !/^\d$/.test(data)) {
        return { elementState, data };
      }

      const newCents = Math.min(currentCents * 10 + parseInt(data, 10), 9999999);
      const r = Math.floor(newCents / 100);
      const c = newCents % 100;
      return {
        elementState: { value: '', selection: [0, 0] as [number, number] },
        data: `${r},${String(c).padStart(2, '0')}`,
      };
    };

    return {
      ...base,
      preprocessors: [cashRegister, ...(base.preprocessors ?? [])],
    };
  })();

  async gerarCobranca(): Promise<void> {
    const perfil = this.perfilService.perfil();
    const chaveAtiva = this.chavePixService.chaveAtiva();

    if (!perfil) {
      this.erro.set('Perfil não configurado.');
      return;
    }
    if (!chaveAtiva) {
      this.erro.set('Nenhuma chave Pix ativa. Acesse "Chaves" para cadastrar.');
      return;
    }

    const amountStr = this.pixForm.value.transactionAmount;
    const amount = amountStr ? maskitoParseNumber(amountStr, { decimalSeparator: ',' }) : 0;
    if (amount <= 0) {
      this.erro.set('Informe um valor maior que zero.');
      return;
    }

    const vencimentoStr = this.pixForm.value.vencimento;
    const vencimento = vencimentoStr ? new Date(vencimentoStr).getTime() : undefined;

    this.gerando.set(true);
    this.erro.set(null);
    try {
      const cobranca = await this.cobrancaService.gerar({
        perfil,
        chaveAtiva,
        valor: amount,
        descricao: this.pixForm.value.infoAdicional || undefined,
        vencimento,
      });
      this.router.navigate(['/cobranca', cobranca.id]);
    } catch (e: any) {
      this.erro.set(e?.message ?? 'Erro ao gerar cobrança.');
    } finally {
      this.gerando.set(false);
    }
  }


  toggleVencimento(): void {
    this.mostrarVencimento.update((v) => !v);
    if (!this.mostrarVencimento()) {
      this.pixForm.controls.vencimento.setValue('');
    }
  }
}
