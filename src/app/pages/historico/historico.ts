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
}
