import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { PerfilService } from '../../application/perfil.service';
import { ThemeService } from '../../services/theme-service';
import { Router } from '@angular/router';
import { IonButton, IonSpinner, AlertController } from '@ionic/angular/standalone';

@Component({
  selector: 'app-perfil',
  imports: [ReactiveFormsModule, IonButton, IonSpinner],
  templateUrl: './perfil.html',
})
export class Perfil implements OnInit, OnDestroy {
  perfilService = inject(PerfilService);
  themeService = inject(ThemeService);
  router = inject(Router);

  private readonly alertController = inject(AlertController);

  salvando = signal(false);
  sucesso = signal(false);
  erro = signal<string | null>(null);

  private todasCidades: string[] = [];
  cidadesFiltradas = signal<string[]>([]);
  private destroy$ = new Subject<void>();

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
    this.carregarCidades();
    this.perfilForm.get('merchantCity')!.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(v => this.filtrarCidades(v ?? ''));
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async carregarCidades() {
    try {
      const res = await fetch('/cidades.json');
      this.todasCidades = await res.json();
      this.filtrarCidades(this.perfilForm.value.merchantCity ?? '');
    } catch (e) {
      console.error('Falha ao carregar cidades.json', e);
    }
  }

  private filtrarCidades(termo: string) {
    if (termo.length < 2) {
      this.cidadesFiltradas.set([]);
      return;
    }
    const t = termo.toLowerCase();
    this.cidadesFiltradas.set(
      this.todasCidades.filter(c => c.toLowerCase().includes(t)).slice(0, 30)
    );
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
    const alert = await this.alertController.create({
      header: 'Excluir perfil',
      message: 'Todos os dados serão apagados permanentemente. Esta ação não pode ser desfeita.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Excluir tudo',
          role: 'destructive',
          handler: async () => {
            await this.perfilService.remover();
            this.perfilForm.reset();
            this.router.navigate(['/perfil']);
          },
        },
      ],
    });
    await alert.present();
  }
}
