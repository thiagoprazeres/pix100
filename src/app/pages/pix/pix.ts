import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { MaskitoDirective } from '@maskito/angular';
import { maskitoNumberOptionsGenerator, maskitoParseNumber } from '@maskito/kit';
import { PerfilService } from '../../services/perfil-service';
import { PixService } from '../../services/pix-service';
import { PixInterface } from '../../interfaces/pix-interface';
import { Router } from '@angular/router';

@Component({
  selector: 'app-pix',
  imports: [ReactiveFormsModule, MaskitoDirective],
  templateUrl: './pix.html',
})
export class Pix {
  private readonly perfilService = inject(PerfilService);
  private readonly pixService = inject(PixService);
  private readonly router = inject(Router);

  sucesso = false;
  erro = false;

  protected readonly perfil = this.perfilService.perfil();

  readonly maskitoOptions = maskitoNumberOptionsGenerator({
    min: 0,
    maximumFractionDigits: 2,
    prefix: 'R$ ',
    minimumFractionDigits: 2,
    decimalSeparator: ',',
    thousandSeparator: '.',
  });

  pixForm = new FormGroup({
    transactionAmount: new FormControl<string | null>(null, {
      nonNullable: false,
      validators: [Validators.required],
    }),
    infoAdicional: new FormControl<string>(''),
  });

  salvarPix() {
    if (this.pixForm.invalid) {
      this.erro = true;
      this.sucesso = false;
      return;
    }
    const amountStr = this.pixForm.value.transactionAmount;
    const amount = amountStr ? maskitoParseNumber(amountStr, { decimalSeparator: ',' }) : 0;

    if (amount <= 0) {
      this.erro = true;
      this.sucesso = false;
      return;
    }

    const pix: PixInterface = {
      transactionAmount: amount,
      infoAdicional: this.pixForm.value.infoAdicional ?? undefined,
    };
    this.pixService.gerarPix(pix).then(resultado => {
      console.log('PIX gerado:', resultado);
      this.sucesso = true;
      this.erro = false;
      this.router.navigate(['/pix', resultado.txid]);
    });
  }
}
