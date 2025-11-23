import { Injectable, signal } from '@angular/core';
import { PerfilInterface } from '../interfaces/perfil-interface';

const STORAGE_KEY = 'pix100.perfil.v1';

@Injectable({
  providedIn: 'root',
})
export class PerfilService {
  private readonly _perfil = signal<PerfilInterface | null>(this.loadFromStorage());

  readonly perfil = this._perfil.asReadonly();

  salvarPerfil(perfil: PerfilInterface) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(perfil));
    this._perfil.set(perfil);
  }

  limparPerfil() {
    localStorage.removeItem(STORAGE_KEY);
    this._perfil.set(null);
  }

  perfilExiste(): boolean {
    return this._perfil() !== null;
  }

  private loadFromStorage(): PerfilInterface | null {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  }
}
