import { Injectable, inject, signal } from '@angular/core';
import { createChargeIntent } from '@thiagoprazeres/pix-charge-core';
import { analyzePixTransaction } from '@thiagoprazeres/pix-antifraud-core';
import { StoragePort } from '../infrastructure/storage/storage.port';
import { BrCodeAdapter } from '../infrastructure/brcode/brcode.adapter';
import { Cobranca, Pagador } from '../domain/cobranca/cobranca.model';
import { Perfil } from '../domain/perfil/perfil.model';
import { ChavePix } from '../domain/chave-pix/chave-pix.model';
import { sanitizeMerchantName, sanitizeMerchantCity, sanitizeInfoAdicional, gerarBrCodeRef } from '../domain/cobranca/brcode.projection';
import { EventoConciliacao } from '../domain/conciliacao/evento-conciliacao.model';
import { gerarIdempotencyKey } from '../domain/conciliacao/conciliacao.rules';

@Injectable({ providedIn: 'root' })
export class CobrancaService {
  private readonly _cobrancas = signal<Cobranca[]>([]);
  readonly cobrancas = this._cobrancas.asReadonly();
  private readonly pixUtils = inject(BrCodeAdapter);

  constructor(private storage: StoragePort) {}

  async init(perfilId: string): Promise<void> {
    const cobrancas = await this.storage.getCobrancas(perfilId);
    this._cobrancas.set(cobrancas);
  }

  async gerar(params: {
    perfil: Perfil;
    chaveAtiva: ChavePix;
    valor: number;
    descricao?: string;
    vencimento?: number;
  }): Promise<Cobranca> {
    const { perfil, chaveAtiva, valor, descricao, vencimento } = params;

    if (chaveAtiva.status === 'arquivada') {
      throw new Error('A chave ativa está arquivada. Selecione outra chave.');
    }
    if (vencimento !== undefined && valor <= 0) {
      throw new Error('Cobranças com vencimento exigem valor definido.');
    }

    const merchantName = sanitizeMerchantName(perfil.merchantName);
    const merchantCity = sanitizeMerchantCity(perfil.merchantCity);
    const id = crypto.randomUUID();
    const brCodeRef = gerarBrCodeRef();
    const now = Date.now();

    const { brcode, qrSvg } = await this.pixUtils.generate({
      pixKey: chaveAtiva.valor,
      merchantName,
      merchantCity,
      transactionAmount: valor,
      referenceLabel: brCodeRef,
      infoAdicional: descricao ? sanitizeInfoAdicional(descricao) : undefined,
    });

    const { intent: chargeIntent } = createChargeIntent({
      pixKey: chaveAtiva.valor,
      amount: valor,
      description: descricao,
      merchantName,
      merchantCity,
      brcode,
      expiresAt: vencimento,
    });

    const cobranca: Cobranca = {
      id,
      brCodeRef,
      perfilId: perfil.id,
      chavePixId: chaveAtiva.id,
      snapshot: {
        chaveId: chaveAtiva.id,
        chaveValor: chaveAtiva.valor,
        chaveTipo: chaveAtiva.tipo,
        merchantName,
        merchantCity,
      },
      valor,
      descricao,
      vencimento,
      statusAtual: 'pendente',
      brcode,
      qrSvg,
      criadaEm: now,
      atualizadaEm: now,
      chargeIntent,
    };

    await this.storage.saveCobranca(cobranca);

    const eventoKey = gerarIdempotencyKey(id, 'criada', now);
    const evento: EventoConciliacao = {
      id: crypto.randomUUID(),
      cobrancaId: id,
      tipo: 'criada',
      origem: 'sistema',
      timestamp: now,
      statusAnterior: 'pendente',
      statusNovo: 'pendente',
      idempotencyKey: eventoKey,
    };
    await this.storage.saveEvento(evento);

    this._cobrancas.set([cobranca, ...this._cobrancas()]);
    return cobranca;
  }

  async buscarPorId(id: string): Promise<Cobranca | undefined> {
    return this.storage.getCobranca(id);
  }

  async processarExpiracoes(perfilId: string): Promise<void> {
    const cobrancas = await this.storage.getCobrancas(perfilId);
    const agora = Date.now();
    const atualizadas: Cobranca[] = [];

    for (const c of cobrancas) {
      if (c.statusAtual === 'pendente' && c.vencimento && c.vencimento < agora) {
        const eventoKey = gerarIdempotencyKey(c.id, 'expirada_automaticamente', agora);
        const jaExiste = await this.storage.getEventoPorIdempotencyKey(eventoKey);
        if (!jaExiste) {
          const evento: EventoConciliacao = {
            id: crypto.randomUUID(),
            cobrancaId: c.id,
            tipo: 'expirada_automaticamente',
            origem: 'sistema',
            timestamp: agora,
            statusAnterior: 'pendente',
            statusNovo: 'expirada',
            idempotencyKey: eventoKey,
          };
          await this.storage.saveEvento(evento);
          const atualizada: Cobranca = { ...c, statusAtual: 'expirada', atualizadaEm: agora };
          await this.storage.saveCobranca(atualizada);
          atualizadas.push(atualizada);
        } else {
          atualizadas.push(c);
        }
      } else {
        atualizadas.push(c);
      }
    }

    this._cobrancas.set(atualizadas.sort((a, b) => b.criadaEm - a.criadaEm));
  }

  reset(): void {
    this._cobrancas.set([]);
  }

  async atualizarLocal(cobranca: Cobranca): Promise<void> {
    this._cobrancas.set(
      this._cobrancas().map((c) => (c.id === cobranca.id ? cobranca : c))
    );
  }

  async registrarPagador(cobrancaId: string, pagador: Pagador): Promise<Cobranca> {
    const cobranca = await this.storage.getCobranca(cobrancaId);
    if (!cobranca) {
      throw new Error('Cobrança não encontrada.');
    }

    const now = Date.now();
    let atualizada: Cobranca = {
      ...cobranca,
      pagador,
      atualizadaEm: now,
    };

    if (pagador.endToEndId && atualizada.chargeIntent) {
      const knownE2EIds = this._cobrancas()
        .filter(c => c.id !== cobrancaId && c.pagador?.endToEndId)
        .map(c => c.pagador!.endToEndId!);
      const { decision } = analyzePixTransaction({
        txid: atualizada.chargeIntent.txid,
        e2eid: pagador.endToEndId,
        expectedAmount: atualizada.valor,
        settledAmount: atualizada.valor,
        paidAt: pagador.paidAt,
        chargeCreatedAt: atualizada.criadaEm,
        payerISPB: pagador.banco ?? '',
        pixKey: atualizada.snapshot.chaveValor,
        userId: atualizada.perfilId,
        channel: 'manual',
        knownE2EIds,
      });
      atualizada = { ...atualizada, antiFraudDecision: decision };
    }

    await this.storage.saveCobranca(atualizada);

    const eventoKey = gerarIdempotencyKey(cobrancaId, 'pagador_registrado', now);
    const evento: EventoConciliacao = {
      id: crypto.randomUUID(),
      cobrancaId,
      tipo: 'pagador_registrado',
      origem: 'manual',
      timestamp: now,
      statusAnterior: cobranca.statusAtual,
      statusNovo: cobranca.statusAtual,
      idempotencyKey: eventoKey,
    };
    await this.storage.saveEvento(evento);

    await this.atualizarLocal(atualizada);
    return atualizada;
  }
}
