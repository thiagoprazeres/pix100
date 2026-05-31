import { describe, expect, it } from 'vitest';
import { serialize } from './carne-leao.serializer';
import { parse } from './carne-leao.parser';
import { ArquivoCarneLeao, CODIGO_RECEITA_SAUDE } from './carne-leao.model';

const arquivo: ArquivoCarneLeao = {
  cpfTitular: '12345678901',
  recebimentos: [
    {
      data: new Date(2025, 4, 10),
      codigoRendimento: CODIGO_RECEITA_SAUDE,
      codigoOcupacao: '225',
      valorRecebido: 350,
      valorDeducao: 0,
      historico: 'Consulta João',
      indicadorRecebidoDe: 'PF',
      cpfTitular: '12345678901',
      cpfBeneficiario: '12345678901',
      cpfPagador: '11122233344',
      cpfNaoInformado: 'N',
      indicadorIrrf: 'N',
      receitaSaude: 'S',
    },
    {
      data: new Date(2025, 4, 15),
      codigoRendimento: CODIGO_RECEITA_SAUDE,
      codigoOcupacao: '231',
      valorRecebido: 180.75,
      valorDeducao: 0,
      historico: 'Sessão',
      indicadorRecebidoDe: 'PJ',
      cpfTitular: '12345678901',
      cpfBeneficiario: '12345678901',
      cnpjPagador: '11222333000181',
      cpfNaoInformado: 'N',
      indicadorIrrf: 'N',
      receitaSaude: 'S',
    },
  ],
};

describe('parse', () => {
  it('round-trip serialize->parse preserves data', () => {
    const txt = serialize(arquivo);
    const parsed = parse(txt);
    expect(parsed.cpfTitular).toBe('12345678901');
    expect(parsed.recebimentos.length).toBe(2);
    expect(parsed.recebimentos[0].valorRecebido).toBeCloseTo(350);
    expect(parsed.recebimentos[1].cnpjPagador).toBe('11222333000181');
    expect(parsed.recebimentos[1].indicadorRecebidoDe).toBe('PJ');
  });

  it('skips blank lines and unknown ocupacao', () => {
    const txt = [
      '# header',
      '',
      'REC;01/05/2025;R01.001.001;999;100,00;0,00;x;PF;11111111111;11111111111;22222222222;;N;N;;S',
    ].join('\n');
    expect(parse(txt).recebimentos.length).toBe(0);
  });
});
