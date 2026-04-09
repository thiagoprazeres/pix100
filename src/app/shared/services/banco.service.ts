import { Injectable, signal } from '@angular/core';
import { getInstitutionByIspb, searchInstitutionsByName, type InstitutionEntry } from '@thiagoprazeres/ispb-participants';
import { parseE2EId, isValidE2EId } from '@thiagoprazeres/parse-e2eid';

export interface BancoEntry {
  ispb: string;
  nome: string;
  nomeReduzido: string;
}

function toEntry(inst: InstitutionEntry): BancoEntry {
  return { ispb: inst.ispb, nome: inst.name, nomeReduzido: inst.shortName };
}

@Injectable({ providedIn: 'root' })
export class BancoService {
  readonly carregamentoFalhou = signal(false);

  async carregar(): Promise<void> {
    // No-op: participant data is bundled via @thiagoprazeres/ispb-participants
  }

  resolverPorISPB(ispb: string): BancoEntry | null {
    const padded = ispb.padStart(8, '0');
    const inst = getInstitutionByIspb(padded);
    return inst ? toEntry(inst) : null;
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
    return searchInstitutionsByName(termo).slice(0, 20).map(toEntry);
  }

  extrairISPBDoE2EId(e2eId: string): string | null {
    const v = e2eId.trim();
    if (isValidE2EId(v)) {
      try {
        return parseE2EId(v).ispb;
      } catch {
        // fall through
      }
    }
    const match = v.match(/^E(\d{8})/i);
    return match ? match[1] : null;
  }
}
