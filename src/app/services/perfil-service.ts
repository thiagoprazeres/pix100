import { Injectable, signal, computed } from '@angular/core';
import { PerfilInterface } from '../interfaces/perfil-interface';

const STORAGE_KEY = 'pix100.perfis.v2';

export interface PerfilStorageData {
  perfis: PerfilInterface[];
  activeId: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class PerfilService {
  private readonly state = signal<PerfilStorageData>(this.loadFromStorage());

  readonly perfil = computed(() => {
    const s = this.state();
    if (!s.activeId) return null;
    return s.perfis.find((p) => p.id === s.activeId) || null;
  });

  readonly perfis = computed(() => this.state().perfis);

  salvarPerfil(perfil: PerfilInterface) {
    const s = this.state();
    const existingIndex = s.perfis.findIndex((p) => p.id === perfil.id);
    const newPerfis = [...s.perfis];
    if (existingIndex >= 0) {
      newPerfis[existingIndex] = perfil;
    } else {
      newPerfis.push(perfil);
    }
    const newState = { perfis: newPerfis, activeId: s.activeId || perfil.id };
    this.updateState(newState);
  }

  removerPerfil(id: string) {
    const s = this.state();
    const newPerfis = s.perfis.filter((p) => p.id !== id);
    let newActiveId = s.activeId;
    if (newActiveId === id) {
      newActiveId = newPerfis.length > 0 ? newPerfis[0].id : null;
    }
    this.updateState({ perfis: newPerfis, activeId: newActiveId });
  }

  tornarAtivo(id: string) {
    this.updateState({ ...this.state(), activeId: id });
  }

  limparTudo() {
    this.updateState({ perfis: [], activeId: null });
  }

  limparPerfil() {
    if (this.perfil()) {
      this.removerPerfil(this.perfil()!.id);
    }
  }

  perfilExiste(): boolean {
    return this.state().perfis.length > 0;
  }

  private updateState(newState: PerfilStorageData) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    this.state.set(newState);
  }

  private loadFromStorage(): PerfilStorageData {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
    
    // Migração da v1 para v2 caso o usuário já tivesse o app instalado
    const oldData = localStorage.getItem('pix100.perfil.v1');
    if (oldData) {
      const oldPerfil: PerfilInterface = JSON.parse(oldData);
      oldPerfil.id = 'default-v1';
      oldPerfil.titulo = 'Perfil Principal';
      const migratedState = { perfis: [oldPerfil], activeId: oldPerfil.id };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedState));
      return migratedState;
    }
    return { perfis: [], activeId: null };
  }
}
