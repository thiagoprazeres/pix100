import { Component, inject, OnInit, computed, signal } from '@angular/core';
import { CobrancaService } from '../../application/cobranca.service';
import { PerfilService } from '../../application/perfil.service';
import { Cobranca, STATUS_COBRANCA_LABELS, StatusCobranca } from '../../domain/cobranca/cobranca.model';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { StatusClassPipe } from '../../shared/pipes/status-class.pipe';
import { IonButton, ToastController } from '@ionic/angular/standalone';

@Component({
  selector: 'app-historico',
  imports: [DatePipe, CurrencyPipe, RouterLink, StatusClassPipe, IonButton],
  templateUrl: './historico.html',
})
export class Historico implements OnInit {
  private readonly cobrancaService = inject(CobrancaService);
  private readonly perfilService = inject(PerfilService);

  private readonly toastController = inject(ToastController);
  statusLabels = STATUS_COBRANCA_LABELS;

  filtroStatus = signal<StatusCobranca | 'todas'>('todas');

  readonly todasCobrancas = this.cobrancaService.cobrancas;

  readonly cobrancas = computed(() => {
    const filtro = this.filtroStatus();
    const lista = this.todasCobrancas();
    return filtro === 'todas' ? lista : lista.filter(c => c.statusAtual === filtro);
  });

  readonly totalPago = computed(() =>
    this.todasCobrancas()
      .filter(c => c.statusAtual === 'paga')
      .reduce((s, c) => s + c.valor, 0)
  );

  readonly totalPendente = computed(() =>
    this.todasCobrancas()
      .filter(c => c.statusAtual === 'pendente')
      .reduce((s, c) => s + c.valor, 0)
  );

  readonly contadores = computed((): Record<string, number> => {
    const lista = this.todasCobrancas();
    return {
      todas: lista.length,
      pendente: lista.filter(c => c.statusAtual === 'pendente').length,
      paga: lista.filter(c => c.statusAtual === 'paga').length,
      expirada: lista.filter(c => c.statusAtual === 'expirada').length,
      cancelada: lista.filter(c => c.statusAtual === 'cancelada').length,
    };
  });

  async ngOnInit(): Promise<void> {
    const perfil = this.perfilService.perfil();
    if (perfil) {
      await this.cobrancaService.processarExpiracoes(perfil.id);
    }
  }

  copiarPixRapido(cobranca: Cobranca, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    navigator.clipboard.writeText(cobranca.brcode).then(async () => {
      const toast = await this.toastController.create({
        message: 'BR Code copiado!',
        duration: 2000,
        position: 'bottom',
        color: 'success',
      });
      await toast.present();
    });
  }

  setFiltro(status: string): void {
    this.filtroStatus.set(status as StatusCobranca | 'todas');
  }

  exportarCsv(): void {
    const lista = this.todasCobrancas();
    if (!lista.length) {
      this.toastController.create({ message: 'Não há registros para exportar.', duration: 2500, position: 'bottom', color: 'warning' }).then(t => t.present());
      return;
    }

    const cabecalho = [
      'ID Interno', 'BRCodeRef', 'Valor', 'Status', 'Descrição', 'Vencimento', 'BR Code', 'Criado em',
      'Pagador Nome', 'Pagador Documento', 'Pagador Banco', 'Pagador Nome Banco',
      'Pagador Agência', 'Pagador Conta', 'Pagador Tipo Conta', 'Pagador Chave Pix',
      'E2EId', 'Pago em',
    ];
    const linhas = lista.map((c) => [
      c.id,
      c.brCodeRef,
      c.valor.toFixed(2),
      this.statusLabels[c.statusAtual],
      c.descricao ?? '',
      c.vencimento ? new Date(c.vencimento).toISOString() : '',
      c.brcode,
      new Date(c.criadaEm).toISOString(),
      c.pagador?.nome ?? '',
      c.pagador?.documento ?? '',
      c.pagador?.banco ?? '',
      c.pagador?.nomeBanco ?? '',
      c.pagador?.agencia ?? '',
      c.pagador?.conta ?? '',
      c.pagador?.tipoConta ?? '',
      c.pagador?.chavePix ?? '',
      c.pagador?.endToEndId ?? '',
      c.pagador?.paidAt ? new Date(c.pagador.paidAt).toISOString() : '',
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
