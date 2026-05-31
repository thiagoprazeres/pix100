import {
  ArquivoCarneLeao,
  IndicadorRecebidoDe,
  LancamentoRecebimento,
  SimNao,
} from './carne-leao.model';
import { isOcupacaoSaude } from './ocupacao.model';

/** Inverso de carne-leao.serializer. Tolerante a linhas em branco e comentários. */

const TITULAR_RE = /^#\s*Titular:\s*(\d{11})\s*$/i;

function parseData(s: string): Date {
  const [dd, mm, yyyy] = s.split('/').map((x) => parseInt(x, 10));
  return new Date(yyyy, mm - 1, dd);
}

function parseValor(s: string): number {
  if (!s) return 0;
  return parseFloat(s.replace(/\./g, '').replace(',', '.'));
}

function isPF(s: string): s is IndicadorRecebidoDe {
  return s === 'PF' || s === 'PJ' || s === 'EX';
}
function isSN(s: string): s is SimNao {
  return s === 'S' || s === 'N';
}

export function parse(texto: string): ArquivoCarneLeao {
  let cpfTitular = '';
  const recebimentos: LancamentoRecebimento[] = [];

  for (const linhaRaw of texto.split(/\r?\n/)) {
    const linha = linhaRaw.trim();
    if (!linha) continue;
    if (linha.startsWith('#')) {
      const m = TITULAR_RE.exec(linha);
      if (m) cpfTitular = m[1];
      continue;
    }
    const campos = linha.split(';');
    if (campos[0] !== 'REC' || campos.length < 16) continue;

    const [
      ,
      data,
      codigoRendimento,
      codigoOcupacao,
      valorRecebido,
      valorDeducao,
      historico,
      indicadorRecebidoDe,
      cpfTit,
      cpfBen,
      cpfPag,
      cnpjPag,
      cpfNaoInformado,
      indicadorIrrf,
      valorIrrf,
      receitaSaude,
    ] = campos;

    if (!isOcupacaoSaude(codigoOcupacao)) continue;
    if (!isPF(indicadorRecebidoDe)) continue;

    recebimentos.push({
      data: parseData(data),
      codigoRendimento,
      codigoOcupacao,
      valorRecebido: parseValor(valorRecebido),
      valorDeducao: parseValor(valorDeducao),
      historico,
      indicadorRecebidoDe,
      cpfTitular: cpfTit,
      cpfBeneficiario: cpfBen,
      cpfPagador: cpfPag || undefined,
      cnpjPagador: cnpjPag || undefined,
      cpfNaoInformado: isSN(cpfNaoInformado) ? cpfNaoInformado : 'N',
      indicadorIrrf: isSN(indicadorIrrf) ? indicadorIrrf : 'N',
      valorIrrf: valorIrrf ? parseValor(valorIrrf) : undefined,
      receitaSaude: isSN(receitaSaude) ? receitaSaude : 'S',
    });
  }

  return { cpfTitular, recebimentos };
}
