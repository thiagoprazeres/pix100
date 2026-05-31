import {
  ArquivoCarneLeao,
  LancamentoRecebimento,
  CODIGO_RECEITA_SAUDE,
} from './carne-leao.model';

/**
 * Serializa o arquivo Carnê-Leão no formato CSV ponto-e-vírgula da RFB.
 *
 * Cada lançamento de recebimento é uma linha com 14 campos separados por ';',
 * na ordem definida na spec da RFB. Valores monetários usam vírgula como
 * separador decimal e nenhum separador de milhar.
 *
 * Linhas começadas por '#' são comentários (apenas para legibilidade humana).
 */

const HEADER = [
  '# Arquivo Carnê-Leão — gerado por Origem100',
  '# Formato: REC;data;codRend;codOcup;valor;deducao;historico;tipo;cpfTit;cpfBen;cpfPag;cnpjPag;cpfNaoInf;irrf;valorIrrf;receitaSaude',
].join('\n');

export function formatarData(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = String(d.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
}

export function formatarValor(v: number): string {
  // 99999999999,99 — vírgula decimal, sem separador de milhar
  return v.toFixed(2).replace('.', ',');
}

export function sanitizarHistorico(h: string): string {
  // Remove ; e quebras de linha (separadores do formato)
  return h.replace(/[;\r\n]+/g, ' ').slice(0, 255).trim();
}

export function serializarLancamento(l: LancamentoRecebimento): string {
  return [
    'REC',
    formatarData(l.data),
    l.codigoRendimento || CODIGO_RECEITA_SAUDE,
    l.codigoOcupacao,
    formatarValor(l.valorRecebido),
    formatarValor(l.valorDeducao),
    sanitizarHistorico(l.historico),
    l.indicadorRecebidoDe,
    l.cpfTitular,
    l.cpfBeneficiario,
    l.cpfPagador ?? '',
    l.cnpjPagador ?? '',
    l.cpfNaoInformado,
    l.indicadorIrrf,
    l.valorIrrf != null ? formatarValor(l.valorIrrf) : '',
    l.receitaSaude,
  ].join(';');
}

export function serialize(arquivo: ArquivoCarneLeao): string {
  const linhas: string[] = [HEADER, `# Titular: ${arquivo.cpfTitular}`];
  for (const r of arquivo.recebimentos) {
    linhas.push(serializarLancamento(r));
  }
  return linhas.join('\n') + '\n';
}
