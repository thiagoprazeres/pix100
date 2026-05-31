import { describe, expect, it } from 'vitest';
import { reconcile } from './carne-leao.reconciler';
import { cobrancaParaLancamento } from './carne-leao.rules';
import { Cobranca } from '../cobranca/cobranca.model';
import { ArquivoCarneLeao } from './carne-leao.model';

function cobranca(over: Partial<Cobranca> = {}): Cobranca {
  return {
    id: over.id ?? 'c1',
    brCodeRef: 'ref',
    perfilId: 'p1',
    chavePixId: 'k1',
    snapshot: {
      chaveId: 'k1',
      chaveValor: 'x',
      chaveTipo: 'cpf',
      merchantName: 'M',
      merchantCity: 'C',
    },
    valor: 100,
    statusAtual: 'paga',
    brcode: '',
    criadaEm: 0,
    atualizadaEm: 0,
    pagador: {
      documento: '11122233344',
      paidAt: new Date(2025, 4, 10).getTime(),
    },
    ...over,
  };
}

const perfil = { cpf: '12345678901', ocupacao: '225' as const };

describe('reconcile', () => {
  it('classifies matching as ja_local', () => {
    const c = cobranca();
    const l = cobrancaParaLancamento(c, perfil);
    const arquivo: ArquivoCarneLeao = { cpfTitular: perfil.cpf, recebimentos: [l] };
    const rel = reconcile(arquivo, [c]);
    expect(rel.jaLocal.length).toBe(1);
    expect(rel.apenasArquivo.length).toBe(0);
  });

  it('classifies missing local as apenas_arquivo', () => {
    const c = cobranca();
    const l = cobrancaParaLancamento(c, perfil);
    const rel = reconcile({ cpfTitular: perfil.cpf, recebimentos: [l] }, []);
    expect(rel.apenasArquivo.length).toBe(1);
  });

  it('totals match arquivo length', () => {
    const c = cobranca();
    const l = cobrancaParaLancamento(c, perfil);
    const rel = reconcile({ cpfTitular: perfil.cpf, recebimentos: [l, l] }, [c]);
    expect(rel.total).toBe(2);
  });
});
