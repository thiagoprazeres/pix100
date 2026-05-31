import { Cobranca } from '../cobranca/cobranca.model';
import { Perfil } from '../perfil/perfil.model';
import {
  CODIGO_RECEITA_SAUDE,
  IndicadorRecebidoDe,
  LancamentoRecebimento,
  SimNao,
} from './carne-leao.model';
import { OcupacaoSaude } from './ocupacao.model';

/** Cobrança elegível para virar lançamento no Carnê-Leão. */
export function cobrancaElegivel(c: Cobranca): boolean {
  return c.statusAtual === 'paga' && !!c.pagador?.paidAt && c.valor > 0;
}

export function noMesAno(c: Cobranca, ano: number, mes1a12: number): boolean {
  if (!c.pagador?.paidAt) return false;
  const d = new Date(c.pagador.paidAt);
  return d.getFullYear() === ano && d.getMonth() + 1 === mes1a12;
}

/** Heurística: documento de 14 dígitos = CNPJ (PJ); 11 = CPF (PF). */
export function inferirTipoPagador(documento?: string): IndicadorRecebidoDe {
  const d = (documento ?? '').replace(/\D/g, '');
  return d.length === 14 ? 'PJ' : 'PF';
}

export function cobrancaParaLancamento(
  c: Cobranca,
  perfil: Pick<Perfil, 'cpf'> & { ocupacao: OcupacaoSaude },
  opts?: { nomeBancoPagador?: string },
): LancamentoRecebimento {
  const documento = (c.pagador?.documento ?? '').replace(/\D/g, '');
  const tipo = inferirTipoPagador(documento);
  const cpfTitular = (perfil.cpf ?? '').replace(/\D/g, '');

  const partesHistorico = [
    c.descricao,
    c.pagador?.nome,
    opts?.nomeBancoPagador ? `via ${opts.nomeBancoPagador}` : null,
    c.pagador?.endToEndId ? `E2E:${c.pagador.endToEndId}` : null,
  ].filter(Boolean) as string[];

  const cpfNaoInformado: SimNao = !documento ? 'S' : 'N';

  return {
    data: new Date(c.pagador!.paidAt),
    codigoRendimento: CODIGO_RECEITA_SAUDE,
    codigoOcupacao: perfil.ocupacao,
    valorRecebido: c.valor,
    valorDeducao: 0,
    historico: partesHistorico.join(' • '),
    indicadorRecebidoDe: tipo,
    cpfTitular,
    cpfBeneficiario: cpfTitular,
    cpfPagador: tipo === 'PF' && documento ? documento : undefined,
    cnpjPagador: tipo === 'PJ' && documento ? documento : undefined,
    cpfNaoInformado,
    indicadorIrrf: 'N',
    receitaSaude: 'S',
  };
}
