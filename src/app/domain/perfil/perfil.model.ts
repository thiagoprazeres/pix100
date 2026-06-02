import { CodigoOcupacao } from '../carne-leao/ocupacao.model';

export interface Perfil {
  id: string;
  merchantName: string;
  merchantCity: string;
  merchantUF?: string;
  cpf?: string;
  /** Código de ocupação principal RFB (Carnê-Leão). Obrigatório para exportar. */
  ocupacao?: CodigoOcupacao;
  criadoEm: number;
  atualizadoEm: number;
}
