import { Component, inject, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { PerfilService } from '../../services/perfil-service';
import { PerfilInterface } from '../../interfaces/perfil-interface';
import { Router } from '@angular/router';

@Component({
  selector: 'app-perfil',
  imports: [ReactiveFormsModule],
  templateUrl: './perfil.html',
})
export class Perfil implements OnInit {
  perfilService = inject(PerfilService);
  router = inject(Router);

  sucesso = false;
  erro = false;

  perfilForm = new FormGroup({
    pixKey: new FormControl('', [Validators.required]),
    merchantName: new FormControl('', [Validators.required]),
    merchantCity: new FormControl('', [Validators.required]),
  });

  ngOnInit() {
    const perfil = this.perfilService.perfil();

    if (perfil) {
      this.perfilForm.patchValue({
        pixKey: perfil.pixKey,
        merchantName: perfil.merchantName,
        merchantCity: perfil.merchantCity,
      });
    }
  }

  salvarPerfil() {
    if (this.perfilForm.invalid) {
      this.erro = true;
      this.sucesso = false;
      return;
    }

    this.perfilService.salvarPerfil(this.perfilForm.value as PerfilInterface);

    this.sucesso = true;
    this.erro = false;
    this.router.navigate(['/']);
  }

  limparPerfil() {
    confirm('Tem certeza que deseja limpar as configurações?') &&
      this.perfilService.limparPerfil() &&
      this.perfilForm.reset();
  }
}
