import { Injectable } from '@angular/core';
import { openDB, IDBPDatabase } from 'idb';
import { StoragePort } from './storage.port';
import { Perfil } from '../../domain/perfil/perfil.model';
import { ChavePix } from '../../domain/chave-pix/chave-pix.model';
import { Cobranca } from '../../domain/cobranca/cobranca.model';
import { EventoConciliacao } from '../../domain/conciliacao/evento-conciliacao.model';

const DB_NAME = 'origem100';
const DB_VERSION = 1;

@Injectable({ providedIn: 'root' })
export class IdbStorage extends StoragePort {
  private dbPromise: Promise<IDBPDatabase>;

  constructor() {
    super();
    this.dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('perfil')) {
          db.createObjectStore('perfil', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('chaves_pix')) {
          const chavesStore = db.createObjectStore('chaves_pix', { keyPath: 'id' });
          chavesStore.createIndex('perfilId', 'perfilId');
          chavesStore.createIndex('status', 'status');
        }
        if (!db.objectStoreNames.contains('cobrancas')) {
          const cobrancasStore = db.createObjectStore('cobrancas', { keyPath: 'id' });
          cobrancasStore.createIndex('perfilId', 'perfilId');
          cobrancasStore.createIndex('chavePixId', 'chavePixId');
          cobrancasStore.createIndex('statusAtual', 'statusAtual');
          cobrancasStore.createIndex('criadaEm', 'criadaEm');
        }
        if (!db.objectStoreNames.contains('eventos_conciliacao')) {
          const eventosStore = db.createObjectStore('eventos_conciliacao', { keyPath: 'id' });
          eventosStore.createIndex('cobrancaId', 'cobrancaId');
          eventosStore.createIndex('timestamp', 'timestamp');
          eventosStore.createIndex('idempotencyKey', 'idempotencyKey', { unique: true });
        }
      },
    });
  }

  private async db(): Promise<IDBPDatabase> {
    return this.dbPromise;
  }

  async getPerfil(): Promise<Perfil | undefined> {
    const db = await this.db();
    const all = await db.getAll('perfil');
    return all[0];
  }

  async savePerfil(perfil: Perfil): Promise<void> {
    const db = await this.db();
    await db.put('perfil', perfil);
  }

  async deletePerfil(): Promise<void> {
    const db = await this.db();
    const all = await db.getAll('perfil');
    if (all.length > 0) {
      await db.delete('perfil', all[0].id);
    }
  }

  async getChaves(perfilId: string): Promise<ChavePix[]> {
    const db = await this.db();
    return db.getAllFromIndex('chaves_pix', 'perfilId', perfilId);
  }

  async getChave(id: string): Promise<ChavePix | undefined> {
    const db = await this.db();
    return db.get('chaves_pix', id);
  }

  async saveChave(chave: ChavePix): Promise<void> {
    const db = await this.db();
    await db.put('chaves_pix', chave);
  }

  async deleteChave(id: string): Promise<void> {
    const db = await this.db();
    await db.delete('chaves_pix', id);
  }

  async getCobrancas(perfilId: string): Promise<Cobranca[]> {
    const db = await this.db();
    const all = await db.getAllFromIndex('cobrancas', 'perfilId', perfilId);
    return all.sort((a, b) => b.criadaEm - a.criadaEm);
  }

  async getCobranca(id: string): Promise<Cobranca | undefined> {
    const db = await this.db();
    return db.get('cobrancas', id);
  }

  async saveCobranca(cobranca: Cobranca): Promise<void> {
    const db = await this.db();
    await db.put('cobrancas', cobranca);
  }

  async getEventos(cobrancaId: string): Promise<EventoConciliacao[]> {
    const db = await this.db();
    const all = await db.getAllFromIndex('eventos_conciliacao', 'cobrancaId', cobrancaId);
    return all.sort((a, b) => a.timestamp - b.timestamp);
  }

  async getEventoPorIdempotencyKey(key: string): Promise<EventoConciliacao | undefined> {
    const db = await this.db();
    return db.getFromIndex('eventos_conciliacao', 'idempotencyKey', key);
  }

  async saveEvento(evento: EventoConciliacao): Promise<void> {
    const db = await this.db();
    await db.put('eventos_conciliacao', evento);
  }

  async chaveUsadaEmCobranca(chaveId: string): Promise<boolean> {
    const db = await this.db();
    const all = await db.getAllFromIndex('cobrancas', 'chavePixId', chaveId);
    return all.length > 0;
  }

  async clearProfileData(perfilId: string): Promise<void> {
    const db = await this.db();

    const chaves = await db.getAllFromIndex('chaves_pix', 'perfilId', perfilId);
    for (const c of chaves) {
      await db.delete('chaves_pix', c.id);
    }

    const cobrancas = await db.getAllFromIndex('cobrancas', 'perfilId', perfilId);
    for (const c of cobrancas) {
      const eventos = await db.getAllFromIndex('eventos_conciliacao', 'cobrancaId', c.id);
      for (const ev of eventos) {
        await db.delete('eventos_conciliacao', ev.id);
      }
      await db.delete('cobrancas', c.id);
    }
  }
}
