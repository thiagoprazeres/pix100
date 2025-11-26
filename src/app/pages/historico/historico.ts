import { Component, inject } from '@angular/core';
import { PixService } from '../../services/pix-service';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-historico',
  imports: [DatePipe, CurrencyPipe, RouterLink],
  templateUrl: './historico.html',
})
export class Historico {
  private readonly pixService = inject(PixService);

  historico = this.pixService.historico();

  limparHistorico() {
    if (confirm('Tem certeza que deseja limpar todo o histórico?')) {
      this.pixService.limparHistorico();
      this.historico = this.pixService.historico();
    }
  }

  exportarCsv() {
    if (!this.historico.length) {
      alert('Não há registros para exportar.');
      return;
    }

    const cabecalho = ['TXID', 'Valor', 'Descrição', 'BR Code', 'Criado em'];
    const linhas = this.historico.map((item) => [
      item.txid,
      item.amount.toString(),
      item.infoAdicional ?? 'Sem descrição',
      item.brcode,
      new Date(item.createdAt).toISOString(),
    ]);

    const csv = [cabecalho, ...linhas]
      .map((linha) => linha.map((valor) => `"${valor.replace(/"/g, '""')}"`).join(';'))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `historico-pix-${new Date().toISOString()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  getTotal(): number {
    return this.historico.reduce((total, item) => total + item.amount, 0);
  }
}
