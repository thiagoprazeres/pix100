/**
 * Códigos de ocupação principal da RFB usados pelo Carnê-Leão.
 * Restrito ao público-alvo do app: profissionais autônomos da área de saúde.
 *
 * Fonte: tabela de Códigos de Ocupação Principal da Receita Federal.
 */
export type OcupacaoSaude = '225' | '226' | '230' | '231' | '232' | '255';

export const OCUPACOES_SAUDE: ReadonlyArray<{ codigo: OcupacaoSaude; label: string }> = [
  { codigo: '225', label: 'Médico' },
  { codigo: '226', label: 'Odontólogo' },
  { codigo: '230', label: 'Fonoaudiólogo' },
  { codigo: '231', label: 'Fisioterapeuta' },
  { codigo: '232', label: 'Terapeuta ocupacional' },
  { codigo: '255', label: 'Psicólogo' },
];

export const OCUPACAO_LABELS: Record<OcupacaoSaude, string> = OCUPACOES_SAUDE.reduce(
  (acc, o) => ({ ...acc, [o.codigo]: o.label }),
  {} as Record<OcupacaoSaude, string>,
);

export function isOcupacaoSaude(v: unknown): v is OcupacaoSaude {
  return typeof v === 'string' && (OCUPACAO_LABELS as Record<string, string>)[v] !== undefined;
}
