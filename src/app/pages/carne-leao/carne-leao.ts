import { Component, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { CarneLeaoService } from '../../application/carne-leao.service';
import { PerfilService } from '../../application/perfil.service';
import { descricaoOcupacao, ehReceitaSaude } from '../../domain/carne-leao/ocupacao.model';
import {
  LancamentoRecebimento,
  RelatorioConciliacao,
} from '../../domain/carne-leao/carne-leao.model';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

@Component({
  selector: 'app-carne-leao',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    MatTabsModule,
    MatTableModule,
    MatIconModule,
  ],
  templateUrl: './carne-leao.html',
})
export class CarneLeao {
  private service = inject(CarneLeaoService);
  perfilService = inject(PerfilService);

  readonly meses = MESES;
  readonly ocupacaoLabel = computed(() => descricaoOcupacao(this.perfilService.perfil()?.ocupacao));
  readonly ehReceitaSaude = computed(() => ehReceitaSaude(this.perfilService.perfil()?.ocupacao));

  readonly anos = (() => {
    const atual = new Date().getFullYear();
    return [atual, atual - 1, atual - 2];
  })();

  // Padrão: mês anterior
  private hoje = new Date();
  private mesAnterior = new Date(this.hoje.getFullYear(), this.hoje.getMonth() - 1, 1);

  filtroForm = new FormGroup({
    ano: new FormControl<number>(this.mesAnterior.getFullYear(), [Validators.required]),
    mes: new FormControl<number>(this.mesAnterior.getMonth() + 1, [Validators.required]),
  });

  erro = signal<string | null>(null);
  previa = signal<LancamentoRecebimento[]>([]);
  relatorio = signal<RelatorioConciliacao | null>(null);

  readonly colunasPrevia = ['data', 'pagador', 'valor', 'historico'];
  readonly colunasItens = ['data', 'tipo', 'doc', 'valor', 'historico'];

  ngOnInit() {
    this.atualizarPrevia();
  }

  atualizarPrevia() {
    this.erro.set(null);
    try {
      const { ano, mes } = this.filtroForm.getRawValue();
      const p = this.service.preverMes(ano!, mes!);
      this.previa.set(p.lancamentos);
    } catch (e: any) {
      this.previa.set([]);
      this.erro.set(e?.message ?? 'Falha ao calcular prévia.');
    }
  }

  exportar() {
    this.erro.set(null);
    try {
      const { ano, mes } = this.filtroForm.getRawValue();
      const { blob, nomeArquivo } = this.service.exportarMes(ano!, mes!);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nomeArquivo;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e: any) {
      this.erro.set(e?.message ?? 'Falha ao exportar.');
    }
  }

  async aoSelecionarArquivo(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.erro.set(null);
    try {
      const rel = await this.service.importarArquivo(file);
      this.relatorio.set(rel);
    } catch (e: any) {
      this.erro.set(e?.message ?? 'Falha ao importar.');
    } finally {
      input.value = '';
    }
  }

  formatarData(d: Date): string {
    return d.toLocaleDateString('pt-BR');
  }
  formatarValor(v: number): string {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  docPagador(l: LancamentoRecebimento): string {
    return l.cpfPagador || l.cnpjPagador || (l.cpfNaoInformado === 'S' ? 'Não informado' : '—');
  }
}
