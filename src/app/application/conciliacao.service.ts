import { Injectable } from '@angular/core';
import { reconcilePixSettlement } from '@thiagoprazeres/pix-reconcile-core';
import { analyzePixTransaction } from '@thiagoprazeres/pix-antifraud-core';
import { buildTrustedReceipt } from '@thiagoprazeres/trusted-receipt-core';
import type { PixLiquidation } from '@thiagoprazeres/pix-charge-core';
import { StoragePort } from '../infrastructure/storage/storage.port';
import { CobrancaService } from './cobranca.service';
import { ChavePixService } from './chave-pix.service';
import { EventoConciliacao, TipoEvento } from '../domain/conciliacao/evento-conciliacao.model';
import { Cobranca } from '../domain/cobranca/cobranca.model';
import { transicaoValida } from '../domain/cobranca/cobranca.rules';
import { gerarIdempotencyKey, tipoEventoParaStatus } from '../domain/conciliacao/conciliacao.rules';

@Injectable({ providedIn: 'root' })
export class ConciliacaoService {
  constructor(
    private storage: StoragePort,
    private cobrancaService: CobrancaService,
    private chavePixService: ChavePixService
  ) {}

  async getEventos(cobrancaId: string): Promise<EventoConciliacao[]> {
    return this.storage.getEventos(cobrancaId);
  }

  async aplicar(params: {
    cobranca: Cobranca;
    tipo: TipoEvento;
    origem: 'manual' | 'sistema';
    ator?: string;
  }): Promise<Cobranca> {
    const { cobranca, tipo, origem, ator } = params;
    const statusNovo = tipoEventoParaStatus(cobranca.statusAtual, tipo);

    if (statusNovo !== cobranca.statusAtual && !transicaoValida(cobranca.statusAtual, statusNovo)) {
      throw new Error(
        `Transição inválida: ${cobranca.statusAtual} → ${statusNovo}`
      );
    }

    const now = Date.now();
    const eventoKey = gerarIdempotencyKey(cobranca.id, tipo, now);
    const jaExiste = await this.storage.getEventoPorIdempotencyKey(eventoKey);
    if (jaExiste) return cobranca;

    const evento: EventoConciliacao = {
      id: crypto.randomUUID(),
      cobrancaId: cobranca.id,
      tipo,
      origem,
      ator,
      timestamp: now,
      statusAnterior: cobranca.statusAtual,
      statusNovo,
      idempotencyKey: eventoKey,
    };
    await this.storage.saveEvento(evento);

    let atualizada: Cobranca = {
      ...cobranca,
      statusAtual: statusNovo,
      atualizadaEm: now,
    };

    if (tipo === 'confirmada_manualmente') {
      atualizada = await this.enriquecerConfirmacao(atualizada);
      await this.chavePixService.marcarConfirmadaPorRecebimento(cobranca.chavePixId);
    }

    await this.storage.saveCobranca(atualizada);
    await this.cobrancaService.atualizarLocal(atualizada);

    return atualizada;
  }

  private async enriquecerConfirmacao(cobranca: Cobranca): Promise<Cobranca> {
    const { chargeIntent, pagador } = cobranca;
    if (!chargeIntent || !pagador?.endToEndId) return cobranca;

    const liquidation: PixLiquidation = {
      e2eid: pagador.endToEndId,
      txid: chargeIntent.txid,
      amount: cobranca.valor,
      paidAt: pagador.paidAt,
      payerISPB: pagador.banco ?? '',
      payerName: pagador.nome,
      payerDocument: pagador.documento,
      source: 'manual',
    };

    const existingDecision = cobranca.antiFraudDecision;
    const decision = existingDecision ?? analyzePixTransaction({
      txid: chargeIntent.txid,
      e2eid: pagador.endToEndId,
      expectedAmount: cobranca.valor,
      settledAmount: cobranca.valor,
      paidAt: pagador.paidAt,
      chargeCreatedAt: cobranca.criadaEm,
      payerISPB: pagador.banco ?? '',
      pixKey: cobranca.snapshot.chaveValor,
      userId: cobranca.perfilId,
      channel: 'manual',
      knownE2EIds: [],
    }).decision;

    const { result: reconciliationResult } = reconcilePixSettlement({
      intent: chargeIntent,
      liquidations: [liquidation],
      links: [],
      decisions: [decision],
    });

    const { receipt: trustedReceipt } = await buildTrustedReceipt({
      txid: chargeIntent.txid,
      e2eid: pagador.endToEndId,
      amount: cobranca.valor,
      paidAt: pagador.paidAt,
      payerISPB: pagador.banco ?? '',
      payerInstitutionName: pagador.nomeBanco ?? '',
      brcode: cobranca.brcode,
      decision,
      evidences: decision.evidences,
    });

    return { ...cobranca, antiFraudDecision: decision, reconciliationResult, trustedReceipt };
  }
}
