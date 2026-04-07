import { Injectable, signal } from '@angular/core';

export interface BancoEntry {
  ispb: string;
  nome: string;
  nomeReduzido: string;
}

@Injectable({ providedIn: 'root' })
export class BancoService {
  private bancos: BancoEntry[] = [];
  private carregado = false;
  readonly carregamentoFalhou = signal(false);

  async carregar(): Promise<void> {
    if (this.carregado) return;
    try {
      const res = await fetch('/bancos.json');
      this.bancos = await res.json();
      this.carregado = true;
      this.carregamentoFalhou.set(false);
    } catch (e) {
      console.error('Falha ao carregar bancos.json', e);
      this.carregamentoFalhou.set(true);
    }
  }

  resolverPorISPB(ispb: string): BancoEntry | null {
    const padded = ispb.padStart(8, '0');
    return this.bancos.find(b => b.ispb === padded) ?? null;
  }

  formatarLabel(b: BancoEntry): string {
    return `${b.nomeReduzido || b.nome} (${b.ispb})`;
  }

  parsearLabel(label: string): BancoEntry | null {
    const match = label.trim().match(/^(.+) \((\d{8})\)$/);
    if (!match) return null;
    return this.resolverPorISPB(match[2]);
  }

  buscar(termo: string): BancoEntry[] {
    if (!termo || termo.length < 2) return [];
    const t = termo.toLowerCase();
    return this.bancos
      .filter(b =>
        b.ispb.includes(t) ||
        b.nome?.toLowerCase().includes(t) ||
        b.nomeReduzido?.toLowerCase().includes(t)
      )
      .slice(0, 20);
  }

  extrairISPBDoE2EId(e2eId: string): string | null {
    const match = e2eId.trim().match(/^E(\d{8})/i);
    return match ? match[1] : null;
  }
}
