import { Component, inject, OnInit, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { PerfilService } from '../../application/perfil.service';
import { ThemeService } from '../../services/theme-service';
import { Router } from '@angular/router';
import { IonButton, IonSpinner } from '@ionic/angular/standalone';

@Component({
  selector: 'app-perfil',
  imports: [ReactiveFormsModule, IonButton, IonSpinner],
  templateUrl: './perfil.html',
})
export class Perfil implements OnInit {
  perfilService = inject(PerfilService);
  themeService = inject(ThemeService);
  router = inject(Router);

  salvando = signal(false);
  sucesso = signal(false);
  erro = signal<string | null>(null);

  perfilForm = new FormGroup({
    merchantName: new FormControl('', [Validators.required, Validators.minLength(3)]),
    merchantCity: new FormControl('', [Validators.required]),
  });

  ngOnInit() {
    const perfil = this.perfilService.perfil();
    if (perfil) {
      this.perfilForm.patchValue({
        merchantName: perfil.merchantName,
        merchantCity: perfil.merchantCity,
      });
    }
  }

  async salvarPerfil() {
    if (this.perfilForm.invalid) {
      this.erro.set('Verifique os campos obrigatórios.');
      return;
    }
    this.salvando.set(true);
    this.erro.set(null);
    try {
      await this.perfilService.salvar({
        merchantName: this.perfilForm.value.merchantName!,
        merchantCity: this.perfilForm.value.merchantCity!,
      });
      this.sucesso.set(true);
      setTimeout(() => this.router.navigate(['/chaves']), 800);
    } catch (e: any) {
      this.erro.set(e?.message ?? 'Erro ao salvar perfil.');
    } finally {
      this.salvando.set(false);
    }
  }

  async removerPerfil() {
    if (!confirm('Excluir perfil e todos os dados? Esta ação não pode ser desfeita.')) return;
    await this.perfilService.remover();
    this.perfilForm.reset();
    this.router.navigate(['/perfil']);
  }
}
