import { ChavePix, TipoChave } from './chave-pix.model';
import { normalizarChave } from './chave-pix.normalizer';

export function validarCpf(digits: string): boolean {
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let rev = 11 - (sum % 11);
  if (rev >= 10) rev = 0;
  if (rev !== parseInt(digits[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  rev = 11 - (sum % 11);
  if (rev >= 10) rev = 0;
  return rev === parseInt(digits[10]);
}

export function validarCnpj(digits: string): boolean {
  if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) return false;
  const calc = (d: string, weights: number[]) =>
    weights.reduce((s, w, i) => s + parseInt(d[i]) * w, 0);
  const mod = (n: number) => { const r = n % 11; return r < 2 ? 0 : 11 - r; };
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  return mod(calc(digits, w1)) === parseInt(digits[12]) &&
         mod(calc(digits, w2)) === parseInt(digits[13]);
}

export function validarValorPorTipo(valor: string, tipo: TipoChave): string | null {
  const normalized = normalizarChave(valor, tipo);
  switch (tipo) {
    case 'cpf':
      if (!validarCpf(normalized)) return 'CPF matematicamente inválido';
      return null;
    case 'cnpj':
      if (!validarCnpj(normalized)) return 'CNPJ matematicamente inválido';
      return null;
    case 'email':
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return 'E-mail inválido';
      return null;
    case 'telefone':
      if (!/^\+55\d{10,11}$/.test(normalized)) return 'Telefone inválido (formato: +55 DDD + número)';
      return null;
    case 'aleatoria':
      if (normalized.length === 0) return 'Chave aleatória não pode ser vazia';
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(normalized))
        return 'Chave aleatória deve ser um UUID válido';
      return null;
    case 'desconhecida':
      if (normalized.length === 0) return 'Chave não pode ser vazia';
      return null;
  }
}

export function verificarUnicidade(
  chaves: ChavePix[],
  valorNormalizado: string,
  excludeId?: string
): boolean {
  return !chaves.some(
    (c) => c.valor === valorNormalizado && c.id !== excludeId
  );
}

export function podeRemoverFisicamente(chave: ChavePix, usadaEmCobranca: boolean): boolean {
  return chave.status !== 'arquivada' && !usadaEmCobranca;
}

export function podeArquivar(chave: ChavePix): boolean {
  return chave.status !== 'arquivada';
}
