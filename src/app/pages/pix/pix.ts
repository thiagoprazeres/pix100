import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { PerfilService } from '../../services/perfil-service';
import { PixService } from '../../services/pix-service';
import { PixInterface } from '../../interfaces/pix-interface';
import { Router } from '@angular/router';

@Component({
  selector: 'app-pix',
  imports: [ReactiveFormsModule],
  templateUrl: './pix.html',
})
export class Pix {
  private readonly perfilService = inject(PerfilService);
  private readonly pixService = inject(PixService);
  private readonly router = inject(Router);

  sucesso = false;
  erro = false;

  protected readonly perfil = this.perfilService.perfil();

  pixForm = new FormGroup({
    transactionAmount: new FormControl<number | null>(null, {
      nonNullable: false,
      validators: [Validators.required, Validators.min(0.01)],
    }),
    infoAdicional: new FormControl<string>(''),
  });

  salvarPix() {
    if (this.pixForm.invalid) {
      this.erro = true;
      this.sucesso = false;
      return;
    }
    const pix: PixInterface = {
      transactionAmount: this.pixForm.value.transactionAmount!,
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
