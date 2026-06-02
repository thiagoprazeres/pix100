import { describe, expect, it } from 'vitest';
import {
  OCUPACOES,
  OCUPACOES_RECEITA_SAUDE,
  ehReceitaSaude,
  ocupacaoExiste,
  descricaoOcupacao,
} from './ocupacao.model';
import { cobrancaParaLancamento } from './carne-leao.rules';
import { Cobranca } from '../cobranca/cobranca.model';

describe('tabela de ocupações', () => {
  it('contains the 6 Receita Saúde codes only as flagged', () => {
    expect(OCUPACOES_RECEITA_SAUDE.map((o) => o.codigo).sort()).toEqual([
      '225', '226', '230', '231', '232', '255',
    ]);
  });

  it('includes non-health professions (advogado, engenheiro, enfermeiro)', () => {
    expect(ocupacaoExiste('241')).toBe(true); // advogado
    expect(ocupacaoExiste('214')).toBe(true); // engenheiro/arquiteto
    expect(ocupacaoExiste('227')).toBe(true); // enfermeiro/nutricionista/farmacêutico
  });

  it('ehReceitaSaude true only for the 6', () => {
    expect(ehReceitaSaude('225')).toBe(true);
    expect(ehReceitaSaude('227')).toBe(false); // enfermeiro NÃO é Receita Saúde
    expect(ehReceitaSaude('241')).toBe(false);
  });

  it('has unique codes', () => {
    const codigos = OCUPACOES.map((o) => o.codigo);
    expect(new Set(codigos).size).toBe(codigos.length);
  });

  it('descricaoOcupacao falls back to code when unknown', () => {
    expect(descricaoOcupacao('225')).toContain('Médico');
    expect(descricaoOcupacao('zzz')).toBe('zzz');
  });
});

describe('cobrancaParaLancamento — regime por ocupação', () => {
  const cobranca: Cobranca = {
    id: 'c1', brCodeRef: 'r', perfilId: 'p', chavePixId: 'k',
    snapshot: { chaveId: 'k', chaveValor: 'x', chaveTipo: 'cpf', merchantName: 'M', merchantCity: 'C' },
    valor: 100, statusAtual: 'paga', brcode: '', criadaEm: 0, atualizadaEm: 0,
    pagador: { documento: '11122233344', paidAt: Date.now() },
  };

  it('Receita Saúde occupation => receitaSaude S', () => {
    const l = cobrancaParaLancamento(cobranca, { cpf: '12345678901', ocupacao: '225' });
    expect(l.receitaSaude).toBe('S');
    expect(l.codigoRendimento).toBe('R01.001.001');
  });

  it('non-Receita-Saúde occupation => receitaSaude N, mesmo código de rendimento', () => {
    const l = cobrancaParaLancamento(cobranca, { cpf: '12345678901', ocupacao: '227' });
    expect(l.receitaSaude).toBe('N');
    expect(l.codigoRendimento).toBe('R01.001.001');
    expect(l.codigoOcupacao).toBe('227');
  });
});
