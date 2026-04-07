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
  private dbInstance: IDBPDatabase | null = null;

  constructor() {
    super();
  }

  private openDb(): Promise<IDBPDatabase> {
    const self = this;
    return openDB(DB_NAME, DB_VERSION, {
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
      terminated() {
        self.dbInstance = null;
      },
      blocking() {
        self.dbInstance?.close();
        self.dbInstance = null;
      },
    });
  }

  private async db(): Promise<IDBPDatabase> {
    if (!this.dbInstance) {
      this.dbInstance = await this.openDb();
    }
    return this.dbInstance;
  }

  private isClosingError(e: unknown): boolean {
    return (
      e instanceof DOMException &&
      (e.name === 'InvalidStateError' ||
        (e.message?.toLowerCase().includes('clos')))
    );
  }

  private async exec<T>(fn: (db: IDBPDatabase) => Promise<T>): Promise<T> {
    try {
      return await fn(await this.db());
    } catch (e) {
      if (this.isClosingError(e)) {
        this.dbInstance = null;
        return fn(await this.db());
      }
      throw e;
    }
  }

  async getPerfil(): Promise<Perfil | undefined> {
    return this.exec(async (db) => {
      const all = await db.getAll('perfil');
      return all[0];
    });
  }

  async savePerfil(perfil: Perfil): Promise<void> {
    return this.exec((db) => db.put('perfil', perfil) as Promise<any>);
  }

  async deletePerfil(): Promise<void> {
    return this.exec(async (db) => {
      const all = await db.getAll('perfil');
      if (all.length > 0) await db.delete('perfil', all[0].id);
    });
  }

  async getChaves(perfilId: string): Promise<ChavePix[]> {
    return this.exec((db) => db.getAllFromIndex('chaves_pix', 'perfilId', perfilId));
  }

  async getChave(id: string): Promise<ChavePix | undefined> {
    return this.exec((db) => db.get('chaves_pix', id));
  }

  async saveChave(chave: ChavePix): Promise<void> {
    return this.exec((db) => db.put('chaves_pix', chave) as Promise<any>);
  }

  async deleteChave(id: string): Promise<void> {
    return this.exec((db) => db.delete('chaves_pix', id) as Promise<any>);
  }

  async getCobrancas(perfilId: string): Promise<Cobranca[]> {
    return this.exec(async (db) => {
      const all = await db.getAllFromIndex('cobrancas', 'perfilId', perfilId);
      return all.sort((a, b) => b.criadaEm - a.criadaEm);
    });
  }

  async getCobranca(id: string): Promise<Cobranca | undefined> {
    return this.exec((db) => db.get('cobrancas', id));
  }

  async saveCobranca(cobranca: Cobranca): Promise<void> {
    return this.exec((db) => db.put('cobrancas', cobranca) as Promise<any>);
  }

  async getEventos(cobrancaId: string): Promise<EventoConciliacao[]> {
    return this.exec(async (db) => {
      const all = await db.getAllFromIndex('eventos_conciliacao', 'cobrancaId', cobrancaId);
      return all.sort((a, b) => a.timestamp - b.timestamp);
    });
  }

  async getEventoPorIdempotencyKey(key: string): Promise<EventoConciliacao | undefined> {
    return this.exec((db) => db.getFromIndex('eventos_conciliacao', 'idempotencyKey', key));
  }

  async saveEvento(evento: EventoConciliacao): Promise<void> {
    return this.exec((db) => db.put('eventos_conciliacao', evento) as Promise<any>);
  }

  async chaveUsadaEmCobranca(chaveId: string): Promise<boolean> {
    return this.exec(async (db) => {
      const all = await db.getAllFromIndex('cobrancas', 'chavePixId', chaveId);
      return all.length > 0;
    });
  }

  async clearProfileData(perfilId: string): Promise<void> {
    return this.exec(async (db) => {
      const tx = db.transaction(
        ['chaves_pix', 'cobrancas', 'eventos_conciliacao', 'perfil'],
        'readwrite',
      );
      const chavesStore = tx.objectStore('chaves_pix');
      const cobrancasStore = tx.objectStore('cobrancas');
      const eventosStore = tx.objectStore('eventos_conciliacao');
      const perfilStore = tx.objectStore('perfil');

      const chaves = await chavesStore.index('perfilId').getAll(perfilId);
      for (const c of chaves) await chavesStore.delete(c.id);

      const cobrancas = await cobrancasStore.index('perfilId').getAll(perfilId);
      for (const c of cobrancas) {
        const eventos = await eventosStore.index('cobrancaId').getAll(c.id);
        for (const ev of eventos) await eventosStore.delete(ev.id);
        await cobrancasStore.delete(c.id);
      }

      const perfis = await perfilStore.getAll();
      for (const p of perfis) await perfilStore.delete(p.id);

      await tx.done;
    });
  }
}
