import { StatusCobranca } from './cobranca.model';

export type TransicaoCobranca =
  | { de: 'pendente'; para: 'paga' }
  | { de: 'paga'; para: 'pendente' }
  | { de: 'pendente'; para: 'expirada' }
  | { de: 'pendente'; para: 'cancelada' }
  | { de: 'paga'; para: 'cancelada' };

const TRANSICOES_VALIDAS: Array<[StatusCobranca, StatusCobranca]> = [
  ['pendente', 'paga'],
  ['paga', 'pendente'],
  ['pendente', 'expirada'],
  ['pendente', 'cancelada'],
  ['paga', 'cancelada'],
];

export function transicaoValida(de: StatusCobranca, para: StatusCobranca): boolean {
  return TRANSICOES_VALIDAS.some(([d, p]) => d === de && p === para);
}

export function cobrancaEstaVencida(vencimento: number | undefined): boolean {
  if (!vencimento) return false;
  return vencimento < Date.now();
}
