import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { MaskitoDirective } from '@maskito/angular';
import { MaskitoOptions } from '@maskito/core';
import { ChavePixService } from '../../application/chave-pix.service';
import { PerfilService } from '../../application/perfil.service';
import { TipoChave, TipoPessoa, ChavePix, TIPO_CHAVE_LABELS, STATUS_CHAVE_LABELS } from '../../domain/chave-pix/chave-pix.model';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-chaves',
  imports: [ReactiveFormsModule, MaskitoDirective],
  templateUrl: './chaves.html',
})
export class Chaves implements OnInit, OnDestroy {
  chavePixService = inject(ChavePixService);
  perfilService = inject(PerfilService);

  private destroy$ = new Subject<void>();

  adicionando = signal(false);
  salvando = signal(false);
  erro = signal<string | null>(null);
  acaoEmAndamento = signal<string | null>(null);

  tipoLabels = TIPO_CHAVE_LABELS;
  statusLabels = STATUS_CHAVE_LABELS;

  chaveForm = new FormGroup({
    tipo: new FormControl<TipoChave>('cpf', [Validators.required]),
    valor: new FormControl('', [Validators.required]),
    tipoPessoa: new FormControl<TipoPessoa>('PF'),
  });

  readonly maskCpf: MaskitoOptions = {
    mask: [/\d/, /\d/, /\d/, '.', /\d/, /\d/, /\d/, '.', /\d/, /\d/, /\d/, '-', /\d/, /\d/],
  };
  readonly maskCnpj: MaskitoOptions = {
    mask: [/\d/, /\d/, '.', /\d/, /\d/, /\d/, '.', /\d/, /\d/, /\d/, '/', /\d/, /\d/, /\d/, /\d/, '-', /\d/, /\d/],
  };
  readonly maskTelefone: MaskitoOptions = {
    mask: ['+', '5', '5', ' ', '(', /\d/, /\d/, ')', ' ', /\d/, /\d/, /\d/, /\d/, /\d/, '-', /\d/, /\d/, /\d/, /\d/],
  };

  get maskitoOptions(): MaskitoOptions | null {
    const tipo = this.chaveForm.value.tipo;
    if (tipo === 'cpf') return this.maskCpf;
    if (tipo === 'cnpj') return this.maskCnpj;
    if (tipo === 'telefone') return this.maskTelefone;
    return null;
  }

  get inputType(): string {
    const tipo = this.chaveForm.value.tipo;
    if (tipo === 'email') return 'email';
    if (tipo === 'telefone') return 'tel';
    return 'text';
  }

  get inputMode(): string {
    const tipo = this.chaveForm.value.tipo;
    if (tipo === 'cpf' || tipo === 'cnpj') return 'numeric';
    if (tipo === 'telefone') return 'tel';
    if (tipo === 'email') return 'email';
    return 'text';
  }

  get exigeTipoPessoa(): boolean {
    const tipo = this.chaveForm.value.tipo;
    return tipo === 'email' || tipo === 'telefone' || tipo === 'aleatoria' || tipo === 'desconhecida';
  }

  get tipoDerivadoAutomaticamente(): TipoPessoa | null {
    const tipo = this.chaveForm.value.tipo;
    if (tipo === 'cpf') return 'PF';
    if (tipo === 'cnpj') return 'PJ';
    return null;
  }

  ngOnInit(): void {
    this.chaveForm.controls.tipo.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.chaveForm.controls.valor.setValue('');
        this.erro.set(null);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  abrirFormulario(): void {
    this.adicionando.set(true);
    this.erro.set(null);
    this.chaveForm.reset({ tipo: 'cpf', tipoPessoa: 'PF' });
  }

  cancelar(): void {
    this.adicionando.set(false);
    this.erro.set(null);
  }

  async salvar(): Promise<void> {
    const perfil = this.perfilService.perfil();
    if (!perfil) return;

    if (this.chaveForm.invalid) {
      this.erro.set('Preencha todos os campos obrigatórios.');
      return;
    }

    const tipo = this.chaveForm.value.tipo!;
    const tipoPessoa = this.tipoDerivadoAutomaticamente ?? this.chaveForm.value.tipoPessoa!;

    this.salvando.set(true);
    this.erro.set(null);
    try {
      await this.chavePixService.cadastrar({
        perfilId: perfil.id,
        tipo,
        valor: this.chaveForm.value.valor!,
        tipoPessoa,
      });
      this.adicionando.set(false);
      this.chaveForm.reset({ tipo: 'cpf', tipoPessoa: 'PF' });
    } catch (e: any) {
      this.erro.set(e?.message ?? 'Erro ao cadastrar chave.');
    } finally {
      this.salvando.set(false);
    }
  }

  async ativar(chave: ChavePix): Promise<void> {
    this.acaoEmAndamento.set(chave.id);
    try {
      await this.chavePixService.ativar(chave.id);
    } catch (e: any) {
      alert(e?.message ?? 'Erro ao ativar chave.');
    } finally {
      this.acaoEmAndamento.set(null);
    }
  }

  async arquivar(chave: ChavePix): Promise<void> {
    if (!confirm(`Arquivar a chave "${chave.valor}"? Ela não poderá ser reativada e não poderá ser excluída.`)) return;
    this.acaoEmAndamento.set(chave.id);
    try {
      await this.chavePixService.arquivar(chave.id);
    } catch (e: any) {
      alert(e?.message ?? 'Erro ao arquivar chave.');
    } finally {
      this.acaoEmAndamento.set(null);
    }
  }

  async remover(chave: ChavePix): Promise<void> {
    if (!confirm(`Remover a chave "${chave.valor}" definitivamente?`)) return;
    this.acaoEmAndamento.set(chave.id);
    try {
      await this.chavePixService.remover(chave.id);
    } catch (e: any) {
      alert(e?.message ?? 'Erro ao remover chave.');
    } finally {
      this.acaoEmAndamento.set(null);
    }
  }
}
