import { TipoChave, TipoPessoa } from './chave-pix.model';

export function normalizarChave(valor: string, tipo: TipoChave): string {
  switch (tipo) {
    case 'cpf':
    case 'cnpj':
      return valor.replace(/\D/g, '');
    case 'email':
      return valor.trim().toLowerCase();
    case 'telefone':
      return normalizarTelefone(valor);
    case 'aleatoria':
    case 'desconhecida':
      return valor.trim();
  }
}

function normalizarTelefone(valor: string): string {
  const digits = valor.replace(/[^\d+]/g, '');
  if (digits.startsWith('+55')) return digits;
  if (digits.startsWith('55') && digits.length >= 12) return '+' + digits;
  return '+55' + digits;
}

export function derivarTipoPessoa(tipo: TipoChave): TipoPessoa | null {
  if (tipo === 'cpf') return 'PF';
  if (tipo === 'cnpj') return 'PJ';
  return null;
}
