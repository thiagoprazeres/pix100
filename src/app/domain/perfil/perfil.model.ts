import { OcupacaoSaude } from '../carne-leao/ocupacao.model';

export interface Perfil {
  id: string;
  merchantName: string;
  merchantCity: string;
  merchantUF?: string;
  cpf?: string;
  /** Código de ocupação RFB (Carnê-Leão). Obrigatório para exportar. */
  ocupacao?: OcupacaoSaude;
  criadoEm: number;
  atualizadoEm: number;
}
