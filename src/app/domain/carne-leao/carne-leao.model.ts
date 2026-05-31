import { OcupacaoSaude } from './ocupacao.model';

/**
 * Modelo dos lançamentos do arquivo de importação do Carnê-Leão.
 * Espelha os campos descritos na spec da RFB:
 * https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/pagamento/carne-leao/manual/formato-arquivo
 */

export type IndicadorRecebidoDe = 'PF' | 'PJ' | 'EX';
export type SimNao = 'S' | 'N';

/** Código fixo de rendimento Receita Saúde — trabalho não assalariado. */
export const CODIGO_RECEITA_SAUDE = 'R01.001.001';

export interface LancamentoRecebimento {
  /** Data do lançamento. */
  data: Date;
  /** Código do rendimento (11 chars). Default: R01.001.001 (Receita Saúde). */
  codigoRendimento: string;
  /** Código da ocupação do titular (3 chars). */
  codigoOcupacao: OcupacaoSaude;
  /** Valor recebido em reais (number — serializer formata). */
  valorRecebido: number;
  /** Valor da dedução. */
  valorDeducao: number;
  /** Histórico livre (até 255 chars). */
  historico: string;
  /** PF / PJ / EX. */
  indicadorRecebidoDe: IndicadorRecebidoDe;
  /** CPF do titular (11 dígitos, só números). */
  cpfTitular: string;
  /** CPF do beneficiário (11 dígitos). Em geral == cpfTitular. */
  cpfBeneficiario: string;
  /** CPF do pagador (11 dígitos) — quando PF. */
  cpfPagador?: string;
  /** CNPJ do pagador (14 dígitos) — quando PJ. */
  cnpjPagador?: string;
  /** "S" se o CPF do pagador não foi informado. */
  cpfNaoInformado: SimNao;
  /** Indicador de IRRF retido na fonte. */
  indicadorIrrf: SimNao;
  /** Valor do IRRF (quando indicadorIrrf = 'S'). */
  valorIrrf?: number;
  /** Receita Saúde — sempre 'S' para as ocupações cobertas. */
  receitaSaude: SimNao;
}

export interface ArquivoCarneLeao {
  /** CPF do titular declarante (do perfil). */
  cpfTitular: string;
  /** Lançamentos de recebimento. */
  recebimentos: LancamentoRecebimento[];
}

export type ClassificacaoConciliacao = 'ja_local' | 'apenas_arquivo' | 'divergente';

export interface ItemConciliacao {
  classificacao: ClassificacaoConciliacao;
  doArquivo: LancamentoRecebimento;
  /** ID da cobrança local correspondente (quando casado). */
  cobrancaIdLocal?: string;
  /** Diferenças encontradas, no caso 'divergente'. */
  diffs?: string[];
}

export interface RelatorioConciliacao {
  total: number;
  jaLocal: ItemConciliacao[];
  apenasArquivo: ItemConciliacao[];
  divergentes: ItemConciliacao[];
}
