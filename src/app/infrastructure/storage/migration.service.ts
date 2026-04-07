import { Injectable } from '@angular/core';
import { IdbStorage } from './idb.storage';
import { Perfil } from '../../domain/perfil/perfil.model';
import { ChavePix, TipoChave, TipoPessoa } from '../../domain/chave-pix/chave-pix.model';
import { Cobranca } from '../../domain/cobranca/cobranca.model';
import { EventoConciliacao } from '../../domain/conciliacao/evento-conciliacao.model';
import { normalizarChave, derivarTipoPessoa } from '../../domain/chave-pix/chave-pix.normalizer';
import {
  sanitizeMerchantName,
  sanitizeMerchantCity,
} from '../../domain/cobranca/brcode.projection';

const MIGRATION_KEY = 'origem100.migrated.v1';

interface LegacyPerfil {
  id: string;
  titulo?: string;
  merchantName: string;
  merchantCity: string;
  pixKey: string;
  tipoChave?: TipoChave;
}

interface LegacyPixGerado {
  txid: string;
  payload: unknown;
  amount: number;
  infoAdicional?: string;
  brcode: string;
  qrBase64?: string;
  createdAt: number;
}

interface LegacyStorageV2 {
  perfis: LegacyPerfil[];
  activeId: string | null;
}

@Injectable({ providedIn: 'root' })
export class MigrationService {
  constructor(private storage: IdbStorage) {}

  async runIfNeeded(): Promise<void> {
    if (localStorage.getItem(MIGRATION_KEY) === '1') return;

    await this.migrateFromV2();
    await this.migrateFromV1();

    localStorage.setItem(MIGRATION_KEY, '1');
  }

  private async migrateFromV2(): Promise<void> {
    const raw = localStorage.getItem('pix100.perfis.v2');
    if (!raw) return;

    try {
      const data: LegacyStorageV2 = JSON.parse(raw);
      const active = data.perfis.find((p) => p.id === data.activeId) ?? data.perfis[0];
      if (!active) return;

      const now = Date.now();
      const perfil: Perfil = {
        id: crypto.randomUUID(),
        merchantName: active.merchantName,
        merchantCity: active.merchantCity,
        criadoEm: now,
        atualizadoEm: now,
      };
      await this.storage.savePerfil(perfil);

      if (active.pixKey && active.tipoChave) {
        const tipo = active.tipoChave;
        const valor = normalizarChave(active.pixKey, tipo);
        const tipoPessoa: TipoPessoa = derivarTipoPessoa(tipo) ?? 'PF';

        const chave: ChavePix = {
          id: crypto.randomUUID(),
          perfilId: perfil.id,
          tipo,
          valor,
          tipoPessoa,
          status: 'ativa',
          verificacaoStatus: 'nao_verificada',
          criadaEm: now,
        };
        await this.storage.saveChave(chave);
      }

      localStorage.removeItem('pix100.perfis.v2');
    } catch (e) {
      console.error('Falha na migração v2', e);
    }
  }

  private async migrateFromV1(): Promise<void> {
    const raw = localStorage.getItem('pix100.historico.v1');
    if (!raw) return;

    try {
      const historico: LegacyPixGerado[] = JSON.parse(raw);
      const perfil = await this.storage.getPerfil();
      if (!perfil) return;

      const chaves = await this.storage.getChaves(perfil.id);
      const chaveAtiva = chaves.find((c) => c.status === 'ativa');

      for (const item of historico) {
        const cobranca: Cobranca = {
          id: crypto.randomUUID(),
          brCodeRef: item.txid,
          perfilId: perfil.id,
          chavePixId: chaveAtiva?.id ?? '',
          snapshot: {
            chaveId: chaveAtiva?.id ?? '',
            chaveValor: chaveAtiva?.valor ?? '',
            chaveTipo: chaveAtiva?.tipo ?? 'desconhecida',
            merchantName: sanitizeMerchantName(perfil.merchantName),
            merchantCity: sanitizeMerchantCity(perfil.merchantCity),
          },
          valor: item.amount,
          descricao: item.infoAdicional,
          statusAtual: 'pendente',
          brcode: item.brcode,
          qrBase64: item.qrBase64,
          criadaEm: item.createdAt,
          atualizadaEm: item.createdAt,
        };
        await this.storage.saveCobranca(cobranca);

        const evento: EventoConciliacao = {
          id: crypto.randomUUID(),
          cobrancaId: cobranca.id,
          tipo: 'criada',
          origem: 'sistema',
          timestamp: item.createdAt,
          statusAnterior: 'pendente',
          statusNovo: 'pendente',
          idempotencyKey: `${cobranca.id}:criada:migrado`,
        };
        await this.storage.saveEvento(evento);
      }

      localStorage.removeItem('pix100.historico.v1');
    } catch (e) {
      console.error('Falha na migração v1', e);
    }
  }
}
