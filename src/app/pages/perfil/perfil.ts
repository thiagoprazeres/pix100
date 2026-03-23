import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { PerfilService } from '../../services/perfil-service';
import { PerfilInterface } from '../../interfaces/perfil-interface';
import { ThemeService } from '../../services/theme-service';
import { Router } from '@angular/router';
import { MaskitoDirective } from '@maskito/angular';
import { MaskitoOptions } from '@maskito/core';
import { Subject, takeUntil } from 'rxjs';

export function documentoValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.parent || !control.value) return null;
    const tipo = control.parent.get('tipoChave')?.value;
    if (tipo !== 'cpf' && tipo !== 'cnpj') return null;

    const digits = control.value.replace(/\D/g, '');
    if (tipo === 'cpf') {
      if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return { documentoInvalido: true };
      let sum = 0;
      for (let i = 0; i < 9; i++) sum += parseInt(digits.charAt(i)) * (10 - i);
      let rev = 11 - (sum % 11);
      if (rev === 10 || rev === 11) rev = 0;
      if (rev !== parseInt(digits.charAt(9))) return { documentoInvalido: true };
      sum = 0;
      for (let i = 0; i < 10; i++) sum += parseInt(digits.charAt(i)) * (11 - i);
      rev = 11 - (sum % 11);
      if (rev === 10 || rev === 11) rev = 0;
      if (rev !== parseInt(digits.charAt(10))) return { documentoInvalido: true };
      return null;
    }

    if (tipo === 'cnpj') {
      if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) return { documentoInvalido: true };
      let size = digits.length - 2;
      let numbers = digits.substring(0, size);
      const digit = digits.substring(size);
      let sum = 0, pos = size - 7;
      for (let i = size; i >= 1; i--) {
        sum += parseInt(numbers.charAt(size - i)) * pos--;
        if (pos < 2) pos = 9;
      }
      let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
      if (result !== parseInt(digit.charAt(0))) return { documentoInvalido: true };
      size = size + 1;
      numbers = digits.substring(0, size);
      sum = 0;
      pos = size - 7;
      for (let i = size; i >= 1; i--) {
        sum += parseInt(numbers.charAt(size - i)) * pos--;
        if (pos < 2) pos = 9;
      }
      result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
      if (result !== parseInt(digit.charAt(1))) return { documentoInvalido: true };
      return null;
    }
    return null;
  };
}

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
    pixKey: new FormControl('', [Validators.required, documentoValidator()]),
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
