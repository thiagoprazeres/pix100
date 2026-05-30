import { Component, inject, OnInit, OnDestroy, signal, effect, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { MaskitoDirective } from '@maskito/angular';
import { MaskitoOptions } from '@maskito/core';
import { ChavePixService } from '../../application/chave-pix.service';
import { PerfilService } from '../../application/perfil.service';
import { TipoChave, TipoPessoa, ChavePix, TIPO_CHAVE_LABELS, STATUS_CHAVE_LABELS } from '../../domain/chave-pix/chave-pix.model';
import { Subject, takeUntil } from 'rxjs';
import { ToastService } from '../../shared/services/toast.service';
import { BancoService } from '../../shared/services/banco.service';
import { BrCodeAdapter } from '../../infrastructure/brcode/brcode.adapter';
import { sanitizeMerchantName, sanitizeMerchantCity, gerarBrCodeRef } from '../../domain/cobranca/brcode.projection';

@Component({
  selector: 'app-chaves',
  imports: [RouterLink, ReactiveFormsModule, MaskitoDirective],
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

  private readonly bancoService = inject(BancoService);
  private readonly toast = inject(ToastService);
  private readonly brCodeAdapter = inject(BrCodeAdapter);
  bancosFiltrados = signal<string[]>([]);

  bancoinvalido = signal(false);

  qrAtivoSvg = signal<string | null>(null);
  private qrAtivoChaveId: string | null = null;

  private readonly tiposUnicos: TipoChave[] = ['cpf', 'cnpj'];
  tiposDisponiveis = computed<{ v: TipoChave; l: string }[]>(() => {
    const todos: { v: TipoChave; l: string }[] = [
      { v: 'cpf', l: 'CPF' },
      { v: 'cnpj', l: 'CNPJ' },
      { v: 'telefone', l: 'Telefone' },
      { v: 'email', l: 'E-mail' },
      { v: 'aleatoria', l: 'Aleatória' },
    ];
    const tiposExistentes = new Set(this.chavePixService.chaves().map((c) => c.tipo));
    return todos.filter((opt) => !this.tiposUnicos.includes(opt.v) || !tiposExistentes.has(opt.v));
  });

  chaveForm = new FormGroup({
    tipo: new FormControl<TipoChave>('cpf', [Validators.required]),
    valor: new FormControl('', [Validators.required]),
    tipoPessoa: new FormControl<TipoPessoa>('PF'),
    banco: new FormControl(''),
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

  constructor() {
    effect(() => {
      const ativa = this.chavePixService.chaveAtiva();
      const perfil = this.perfilService.perfil();
      if (!ativa || !perfil) {
        this.qrAtivoSvg.set(null);
        this.qrAtivoChaveId = null;
        return;
      }
      if (this.qrAtivoChaveId === ativa.id) return;
      this.qrAtivoChaveId = ativa.id;
      void this.gerarQrChaveAtiva(ativa.valor, perfil.merchantName, perfil.merchantCity);
    });
  }

  private async gerarQrChaveAtiva(pixKey: string, merchantName: string, merchantCity: string) {
    try {
      const { qrSvg } = await this.brCodeAdapter.generate({
        pixKey,
        merchantName: sanitizeMerchantName(merchantName),
        merchantCity: sanitizeMerchantCity(merchantCity),
        transactionAmount: 0,
        referenceLabel: gerarBrCodeRef(),
      });
      this.qrAtivoSvg.set(qrSvg);
    } catch (e) {
      console.error('Falha ao gerar QR da chave ativa', e);
      this.qrAtivoSvg.set(null);
    }
  }

  ngOnInit(): void {
    void this.bancoService.carregar();

    this.chaveForm.controls.tipo.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.chaveForm.controls.valor.setValue('');
        this.erro.set(null);
      });

    this.chaveForm.controls.banco.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(v => {
        const termo = v ?? '';
        this.bancoinvalido.set(false);
        const resultados = this.bancoService.buscar(termo);
        this.bancosFiltrados.set(resultados.map(b => this.bancoService.formatarLabel(b)));
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  abrirFormulario(): void {
    this.adicionando.set(true);
    this.erro.set(null);
    const tipoInicial = this.tiposDisponiveis()[0]?.v ?? 'aleatoria';
    const tipoPessoaInicial: TipoPessoa = tipoInicial === 'cnpj' ? 'PJ' : 'PF';
    this.chaveForm.reset({ tipo: tipoInicial, tipoPessoa: tipoPessoaInicial });
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
      const bancoLabel = this.chaveForm.value.banco?.trim() ?? '';
      let bancoISPB: string | undefined;
      let nomeBanco: string | undefined;
      if (bancoLabel) {
        const bancoEntry = this.bancoService.parsearLabel(bancoLabel);
        if (!bancoEntry) {
          this.bancoinvalido.set(true);
          this.salvando.set(false);
          return;
        }
        bancoISPB = bancoEntry.ispb;
        nomeBanco = bancoEntry.nomeReduzido || bancoEntry.nome;
      }
      await this.chavePixService.cadastrar({
        perfilId: perfil.id,
        tipo,
        valor: this.chaveForm.value.valor!,
        tipoPessoa,
        ...(bancoISPB && { banco: bancoISPB }),
        ...(nomeBanco && { nomeBanco }),
      });
      this.adicionando.set(false);
      const tipoInicial = this.tiposDisponiveis()[0]?.v ?? 'aleatoria';
    const tipoPessoaInicial: TipoPessoa = tipoInicial === 'cnpj' ? 'PJ' : 'PF';
    this.chaveForm.reset({ tipo: tipoInicial, tipoPessoa: tipoPessoaInicial });
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
      this.showToast(e?.message ?? 'Erro ao ativar chave.', 'danger');
    } finally {
      this.acaoEmAndamento.set(null);
    }
  }

  async arquivar(chave: ChavePix): Promise<void> {
    const ok = window.confirm(`Arquivar a chave "${chave.valor}"? Ela não poderá ser reativada e não poderá ser excluída.`);
    if (ok) await this.executarArquivar(chave);
  }

  private async executarArquivar(chave: ChavePix): Promise<void> {
    this.acaoEmAndamento.set(chave.id);
    try {
      await this.chavePixService.arquivar(chave.id);
    } catch (e: any) {
      this.showToast(e?.message ?? 'Erro ao arquivar chave.', 'danger');
    } finally {
      this.acaoEmAndamento.set(null);
    }
  }

  async remover(chave: ChavePix): Promise<void> {
    const ok = window.confirm(`Remover a chave "${chave.valor}" definitivamente?`);
    if (ok) await this.executarRemover(chave);
  }

  private async executarRemover(chave: ChavePix): Promise<void> {
    this.acaoEmAndamento.set(chave.id);
    try {
      await this.chavePixService.remover(chave.id);
    } catch (e: any) {
      this.showToast(e?.message ?? 'Erro ao remover chave.', 'danger');
    } finally {
      this.acaoEmAndamento.set(null);
    }
  }

  private showToast(message: string, color: 'primary' | 'success' | 'warning' | 'danger' = 'primary'): void {
    this.toast.show(message, color);
  }
}
