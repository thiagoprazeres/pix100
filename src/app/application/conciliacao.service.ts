import { Injectable } from '@angular/core';
import { StoragePort } from '../infrastructure/storage/storage.port';
import { CobrancaService } from './cobranca.service';
import { ChavePixService } from './chave-pix.service';
import { EventoConciliacao, TipoEvento } from '../domain/conciliacao/evento-conciliacao.model';
import { Cobranca, StatusCobranca } from '../domain/cobranca/cobranca.model';
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

    if (!transicaoValida(cobranca.statusAtual, statusNovo)) {
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

    const atualizada: Cobranca = {
      ...cobranca,
      statusAtual: statusNovo,
      atualizadaEm: now,
    };
    await this.storage.saveCobranca(atualizada);
    await this.cobrancaService.atualizarLocal(atualizada);

    if (tipo === 'confirmada_manualmente') {
      await this.chavePixService.marcarConfirmadaPorRecebimento(cobranca.chavePixId);
    }

    return atualizada;
  }
}
