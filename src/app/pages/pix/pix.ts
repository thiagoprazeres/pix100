import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { MaskitoDirective } from '@maskito/angular';
import { maskitoNumberOptionsGenerator, maskitoParseNumber } from '@maskito/kit';
import { PerfilService } from '../../application/perfil.service';
import { ChavePixService } from '../../application/chave-pix.service';
import { CobrancaService } from '../../application/cobranca.service';
import { Router, RouterLink } from '@angular/router';
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

  readonly maskValor = maskitoNumberOptionsGenerator({
    min: 0,
    maximumFractionDigits: 2,
    prefix: 'R$ ',
    minimumFractionDigits: 2,
    decimalSeparator: ',',
    thousandSeparator: '.',
  });

  pixForm = new FormGroup({
    transactionAmount: new FormControl<string | null>(null, [Validators.required]),
    infoAdicional: new FormControl<string>(''),
    vencimento: new FormControl<string>(''),
  });

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

  adicionarValor(adicional: number): void {
    const currentStr = this.pixForm.value.transactionAmount;
    const currentVal = currentStr ? maskitoParseNumber(currentStr, { decimalSeparator: ',' }) : 0;
    const newVal = currentVal + adicional;
    this.pixForm.controls.transactionAmount.setValue(newVal.toFixed(2).replace('.', ','));
  }

  limparValor(): void {
    this.pixForm.controls.transactionAmount.setValue('');
  }

  toggleVencimento(): void {
    this.mostrarVencimento.update((v) => !v);
    if (!this.mostrarVencimento()) {
      this.pixForm.controls.vencimento.setValue('');
    }
  }
}
