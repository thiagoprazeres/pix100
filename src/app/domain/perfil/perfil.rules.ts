export function validarMerchantName(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return 'Nome do recebedor é obrigatório.';
  if (trimmed.length < 2) return 'Nome deve ter ao menos 2 caracteres.';
  if (trimmed.length > 25) return 'Nome deve ter no máximo 25 caracteres.';
  return null;
}

export function validarMerchantCity(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return 'Cidade é obrigatória.';
  if (trimmed.length < 2) return 'Cidade deve ter ao menos 2 caracteres.';
  if (trimmed.length > 15) return 'Cidade deve ter no máximo 15 caracteres.';
  return null;
}

export function validarPerfil(dados: { merchantName: string; merchantCity: string }): string | null {
  return validarMerchantName(dados.merchantName) ?? validarMerchantCity(dados.merchantCity);
}
