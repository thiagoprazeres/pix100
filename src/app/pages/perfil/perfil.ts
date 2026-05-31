import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { ReactiveFormsModule, FormControl, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MaskitoDirective } from '@maskito/angular';
import { MaskitoOptions } from '@maskito/core';
import { PerfilService } from '../../application/perfil.service';
import { ChavePixService } from '../../application/chave-pix.service';
import { ThemeService } from '../../services/theme-service';
import { Router } from '@angular/router';
import { validarCpf } from '../../domain/chave-pix/chave-pix.rules';
import { normalizarChave } from '../../domain/chave-pix/chave-pix.normalizer';
import { OCUPACOES_SAUDE, OcupacaoSaude } from '../../domain/carne-leao/ocupacao.model';

const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

function cpfValidator(control: AbstractControl): ValidationErrors | null {
  const v = (control.value ?? '').replace(/\D/g, '');
  if (!v) return { required: true };
  if (!validarCpf(v)) return { cpfInvalido: true };
  return null;
}

@Component({
  selector: 'app-perfil',
  imports: [ReactiveFormsModule, MaskitoDirective],
  templateUrl: './perfil.html',
})
export class Perfil implements OnInit, OnDestroy {
  perfilService = inject(PerfilService);
  chavePixService = inject(ChavePixService);
  themeService = inject(ThemeService);
  router = inject(Router);

  salvando = signal(false);
  sucesso = signal(false);
  erro = signal<string | null>(null);

  readonly ufs = UFS;
  readonly ocupacoes = OCUPACOES_SAUDE;
  readonly maskCpf: MaskitoOptions = {
    mask: [/\d/, /\d/, /\d/, '.', /\d/, /\d/, /\d/, '.', /\d/, /\d/, /\d/, '-', /\d/, /\d/],
  };

  private todasCidades: string[] = [];
  cidadesFiltradas = signal<string[]>([]);
  private destroy$ = new Subject<void>();

  perfilForm = new FormGroup({
    merchantName: new FormControl('', [Validators.required, Validators.minLength(3)]),
    cpf: new FormControl({ value: '', disabled: false }, [cpfValidator]),
    merchantUF: new FormControl('', [Validators.required]),
    merchantCity: new FormControl('', [Validators.required]),
    ocupacao: new FormControl<OcupacaoSaude | ''>('', [Validators.required]),
  });

  cpfImutavel = computed(() => !!this.perfilService.perfil()?.cpf);

  ngOnInit() {
    const perfil = this.perfilService.perfil();
    if (perfil) {
      this.perfilForm.patchValue({
        merchantName: perfil.merchantName,
        cpf: perfil.cpf ? this.formatarCpf(perfil.cpf) : '',
        merchantUF: perfil.merchantUF ?? '',
        merchantCity: perfil.merchantCity,
        ocupacao: perfil.ocupacao ?? '',
      });
      if (perfil.cpf) {
        this.perfilForm.controls.cpf.disable();
      }
    }
    this.carregarCidades();
    this.perfilForm.controls.merchantUF.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.perfilForm.controls.merchantCity.setValue('');
        this.filtrarCidades(this.perfilForm.controls.merchantCity.value ?? '');
      });
    this.perfilForm.controls.merchantCity.valueChanges
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
    const uf = this.perfilForm.controls.merchantUF.value;
    if (!uf) {
      this.cidadesFiltradas.set([]);
      return;
    }
    const sufixo = ` - ${uf}`;
    const doEstado = this.todasCidades.filter(c => c.endsWith(sufixo));
    if (termo.length < 2) {
      this.cidadesFiltradas.set(doEstado.slice(0, 30).map(c => c.slice(0, -sufixo.length)));
      return;
    }
    const t = termo.toLowerCase();
    this.cidadesFiltradas.set(
      doEstado
        .filter(c => c.toLowerCase().includes(t))
        .slice(0, 30)
        .map(c => c.slice(0, -sufixo.length))
    );
  }

  private formatarCpf(digits: string): string {
    const d = digits.padStart(11, '0').slice(0, 11);
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
  }

  async salvarPerfil() {
    if (this.perfilForm.invalid) {
      this.erro.set('Verifique os campos obrigatórios.');
      return;
    }
    this.salvando.set(true);
    this.erro.set(null);
    try {
      const ehPrimeiroAcesso = !this.perfilService.perfil();
      const cpfRaw = (this.perfilForm.getRawValue().cpf ?? '').replace(/\D/g, '');

      const perfilSalvo = await this.perfilService.salvar({
        merchantName: this.perfilForm.value.merchantName!,
        merchantCity: this.perfilForm.value.merchantCity!,
        merchantUF: this.perfilForm.value.merchantUF!,
        ocupacao: (this.perfilForm.value.ocupacao || undefined) as OcupacaoSaude | undefined,
        ...(ehPrimeiroAcesso && cpfRaw ? { cpf: cpfRaw } : {}),
      });

      if (ehPrimeiroAcesso && cpfRaw && this.chavePixService.chaves().length === 0) {
        await this.chavePixService.cadastrar({
          perfilId: perfilSalvo.id,
          tipo: 'cpf',
          valor: normalizarChave(cpfRaw, 'cpf'),
          tipoPessoa: 'PF',
        });
      }

      this.sucesso.set(true);
      this.router.navigate(['/cobranca']);
    } catch (e: any) {
      this.erro.set(e?.message ?? 'Erro ao salvar perfil.');
    } finally {
      this.salvando.set(false);
    }
  }

  async removerPerfil() {
    const ok = window.confirm('Excluir perfil: todos os dados serão apagados permanentemente. Esta ação não pode ser desfeita.');
    if (!ok) return;
    await this.perfilService.remover();
    this.perfilForm.reset();
    this.router.navigate(['/perfil']);
  }
}
