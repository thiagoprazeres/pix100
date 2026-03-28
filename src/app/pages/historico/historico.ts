import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CobrancaService } from '../../application/cobranca.service';
import { PerfilService } from '../../application/perfil.service';
import { Cobranca, STATUS_COBRANCA_LABELS } from '../../domain/cobranca/cobranca.model';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { StatusClassPipe } from '../../shared/pipes/status-class.pipe';

@Component({
  selector: 'app-historico',
  imports: [DatePipe, CurrencyPipe, RouterLink, StatusClassPipe],
  templateUrl: './historico.html',
})
export class Historico implements OnInit {
  private readonly cobrancaService = inject(CobrancaService);
  private readonly perfilService = inject(PerfilService);

  showToast = signal(false);
  statusLabels = STATUS_COBRANCA_LABELS;

  readonly cobrancas = this.cobrancaService.cobrancas;
  readonly total = computed(() =>
    this.cobrancas().reduce((s, c) => s + c.valor, 0)
  );

  async ngOnInit(): Promise<void> {
    const perfil = this.perfilService.perfil();
    if (perfil) {
      await this.cobrancaService.processarExpiracoes(perfil.id);
    }
  }

  copiarPixRapido(cobranca: Cobranca, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    navigator.clipboard.writeText(cobranca.brcode).then(() => {
      this.showToast.set(true);
      setTimeout(() => this.showToast.set(false), 3000);
    });
  }

  exportarCsv(): void {
    const lista = this.cobrancas();
    if (!lista.length) {
      alert('Não há registros para exportar.');
      return;
    }

    const cabecalho = ['ID Interno', 'BRCodeRef', 'Valor', 'Status', 'Descrição', 'Vencimento', 'BR Code', 'Criado em'];
    const linhas = lista.map((c) => [
      c.id,
      c.brCodeRef,
      c.valor.toFixed(2),
      this.statusLabels[c.statusAtual],
      c.descricao ?? '',
      c.vencimento ? new Date(c.vencimento).toISOString() : '',
      c.brcode,
      new Date(c.criadaEm).toISOString(),
    ]);

    const csv = [cabecalho, ...linhas]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';'))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `historico-origem100-${new Date().toISOString()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

}
