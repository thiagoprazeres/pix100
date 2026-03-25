import { Injectable, signal, inject } from '@angular/core';
import { IdbStorage } from '../infrastructure/storage/idb.storage';
import { Perfil } from '../domain/perfil/perfil.model';

@Injectable({ providedIn: 'root' })
export class PerfilService {
  private readonly _perfil = signal<Perfil | null>(null);
  readonly perfil = this._perfil.asReadonly();

  private storage = inject(IdbStorage);
  private _chavePixService: { reset: () => void } | null = null;
  private _cobrancaService: { reset: () => void } | null = null;

  registerDependentServices(
    chavePixService: { reset: () => void },
    cobrancaService: { reset: () => void }
  ): void {
    this._chavePixService = chavePixService;
    this._cobrancaService = cobrancaService;
  }

  async init(): Promise<void> {
    const perfil = await this.storage.getPerfil();
    this._perfil.set(perfil ?? null);
  }

  async salvar(dados: { merchantName: string; merchantCity: string }): Promise<Perfil> {
    const now = Date.now();
    const existing = this._perfil();
    const perfil: Perfil = {
      id: existing?.id ?? crypto.randomUUID(),
      merchantName: dados.merchantName.trim(),
      merchantCity: dados.merchantCity.trim(),
      criadoEm: existing?.criadoEm ?? now,
      atualizadoEm: now,
    };
    await this.storage.savePerfil(perfil);
    this._perfil.set(perfil);
    return perfil;
  }

  async remover(): Promise<void> {
    const perfil = this._perfil();
    if (perfil) {
      await this.storage.clearProfileData(perfil.id);
    }
    await this.storage.deletePerfil();
    this._chavePixService?.reset();
    this._cobrancaService?.reset();
    this._perfil.set(null);
  }

  existe(): boolean {
    return this._perfil() !== null;
  }
}
