import { describe, expect, it } from 'vitest';
import {
  formatarData,
  formatarValor,
  sanitizarHistorico,
  serialize,
  serializarLancamento,
} from './carne-leao.serializer';
import { CODIGO_RECEITA_SAUDE, LancamentoRecebimento } from './carne-leao.model';

const base = (over: Partial<LancamentoRecebimento> = {}): LancamentoRecebimento => ({
  data: new Date(2025, 2, 7), // 07/03/2025
  codigoRendimento: CODIGO_RECEITA_SAUDE,
  codigoOcupacao: '225',
  valorRecebido: 1234.5,
  valorDeducao: 0,
  historico: 'Consulta',
  indicadorRecebidoDe: 'PF',
  cpfTitular: '12345678901',
  cpfBeneficiario: '12345678901',
  cpfPagador: '98765432100',
  cpfNaoInformado: 'N',
  indicadorIrrf: 'N',
  receitaSaude: 'S',
  ...over,
});

describe('formatarData', () => {
  it('produces DD/MM/AAAA', () => {
    expect(formatarData(new Date(2025, 0, 5))).toBe('05/01/2025');
  });
});

describe('formatarValor', () => {
  it('uses comma decimal, no thousands sep', () => {
    expect(formatarValor(1234.5)).toBe('1234,50');
    expect(formatarValor(0)).toBe('0,00');
  });
});

describe('sanitizarHistorico', () => {
  it('strips ; and newlines, trims to 255', () => {
    expect(sanitizarHistorico('a;b\nc')).toBe('a b c');
    expect(sanitizarHistorico('x'.repeat(300)).length).toBe(255);
  });
});

describe('serializarLancamento', () => {
  it('formats PF line with all 16 fields', () => {
    const line = serializarLancamento(base());
    const cols = line.split(';');
    expect(cols[0]).toBe('REC');
    expect(cols[1]).toBe('07/03/2025');
    expect(cols[2]).toBe('R01.001.001');
    expect(cols[3]).toBe('225');
    expect(cols[4]).toBe('1234,50');
    expect(cols[7]).toBe('PF');
    expect(cols[10]).toBe('98765432100');
    expect(cols[11]).toBe(''); // sem CNPJ
    expect(cols[15]).toBe('S');
    expect(cols.length).toBe(16);
  });

  it('PJ writes CNPJ and leaves CPF empty', () => {
    const line = serializarLancamento(
      base({ indicadorRecebidoDe: 'PJ', cpfPagador: undefined, cnpjPagador: '11222333000181' }),
    );
    const cols = line.split(';');
    expect(cols[7]).toBe('PJ');
    expect(cols[10]).toBe('');
    expect(cols[11]).toBe('11222333000181');
  });

  it('anonymous pagador marks cpfNaoInformado=S', () => {
    const line = serializarLancamento(
      base({ cpfPagador: undefined, cpfNaoInformado: 'S' }),
    );
    expect(line.split(';')[12]).toBe('S');
  });
});

describe('serialize', () => {
  it('includes header + titular + lines', () => {
    const txt = serialize({
      cpfTitular: '12345678901',
      recebimentos: [base(), base({ valorRecebido: 200 })],
    });
    expect(txt).toContain('# Titular: 12345678901');
    expect(txt.split('\n').filter((l) => l.startsWith('REC')).length).toBe(2);
  });
});
