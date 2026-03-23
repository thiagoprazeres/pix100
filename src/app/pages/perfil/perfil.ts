import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { PerfilService } from '../../services/perfil-service';
import { PerfilInterface } from '../../interfaces/perfil-interface';
import { ThemeService } from '../../services/theme-service';
import { Router } from '@angular/router';
import { MaskitoDirective } from '@maskito/angular';
import { MaskitoOptions } from '@maskito/core';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-perfil',
  imports: [ReactiveFormsModule, MaskitoDirective],
  templateUrl: './perfil.html',
})
export class Perfil implements OnInit, OnDestroy {
  perfilService = inject(PerfilService);
  themeService = inject(ThemeService);
  router = inject(Router);
  private destroy$ = new Subject<void>();

  sucesso = false;
  erro = false;

  perfilForm = new FormGroup({
    id: new FormControl<string>(''),
    titulo: new FormControl<string>('Meu Perfil', [Validators.required]),
    tipoChave: new FormControl<'cpf' | 'cnpj' | 'telefone' | 'email' | 'aleatoria'>('cpf', [Validators.required]),
    pixKey: new FormControl('', [Validators.required]),
    merchantName: new FormControl('', [Validators.required]),
    merchantCity: new FormControl('', [Validators.required]),
  });

  readonly maskCpf: MaskitoOptions = {
    mask: [/\d/, /\d/, /\d/, '.', /\d/, /\d/, /\d/, '.', /\d/, /\d/, /\d/, '-', /\d/, /\d/]
  };

  readonly maskCnpj: MaskitoOptions = {
    mask: [/\d/, /\d/, '.', /\d/, /\d/, /\d/, '.', /\d/, /\d/, /\d/, '/', /\d/, /\d/, /\d/, /\d/, '-', /\d/, /\d/]
  };

  readonly maskTelefone: MaskitoOptions = {
    mask: ['+', '5', '5', ' ', '(', /\d/, /\d/, ')', ' ', /\d/, /\d/, /\d/, /\d/, /\d/, '-', /\d/, /\d/, /\d/, /\d/]
  };

  get maskitoOptions(): MaskitoOptions | null {
    const tipo = this.perfilForm.value.tipoChave;
    if (tipo === 'cpf') return this.maskCpf;
    if (tipo === 'cnpj') return this.maskCnpj;
    if (tipo === 'telefone') return this.maskTelefone;
    return null;
  }

  get inputType(): string {
    const tipo = this.perfilForm.value.tipoChave;
    if (tipo === 'email') return 'email';
    if (tipo === 'telefone') return 'tel';
    return 'text';
  }

  get inputMode(): string {
    const tipo = this.perfilForm.value.tipoChave;
    if (tipo === 'cpf' || tipo === 'cnpj') return 'numeric';
    if (tipo === 'telefone') return 'tel';
    if (tipo === 'email') return 'email';
    return 'text';
  }

  ngOnInit() {
    this.carregarFormulario();

    this.perfilForm.controls.tipoChave.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.perfilForm.controls.pixKey.setValue('');
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  salvarPerfil() {
    if (this.perfilForm.invalid) {
      this.erro = true;
      this.sucesso = false;
      return;
    }

    let key = this.perfilForm.value.pixKey!;
    const type = this.perfilForm.value.tipoChave;

    if (type === 'cpf' || type === 'cnpj') {
      key = key.replace(/\D/g, '');
    } else if (type === 'telefone') {
      key = key.replace(/[\s\(\)\-]/g, '');
    }

    const valueToSave: PerfilInterface = {
      id: this.perfilForm.value.id || this.gerarId(),
      titulo: this.perfilForm.value.titulo || 'Meu Perfil',
      tipoChave: type!,
      pixKey: key,
      merchantName: this.perfilForm.value.merchantName!,
      merchantCity: this.perfilForm.value.merchantCity!,
    };

    this.perfilService.salvarPerfil(valueToSave);

    this.sucesso = true;
    this.erro = false;
    this.router.navigate(['/']);
  }

  carregarFormulario() {
    const perfil = this.perfilService.perfil();
    if (perfil) {
      this.perfilForm.patchValue({ ...perfil });
    } else {
      this.perfilForm.reset({ id: this.gerarId(), titulo: 'Novo Perfil', tipoChave: 'cpf' });
    }
  }

  gerarId() {
    return Math.random().toString(36).substring(2, 9);
  }

  selecionarPerfil(id: string) {
    this.perfilService.tornarAtivo(id);
    this.carregarFormulario();
  }

  novoPerfil() {
    this.perfilService.tornarAtivo('');
    this.carregarFormulario();
  }

  removerPerfil() {
    if (confirm('Tem certeza que deseja excluir este perfil?')) {
      this.perfilService.limparPerfil();
      this.carregarFormulario();
    }
  }
}
