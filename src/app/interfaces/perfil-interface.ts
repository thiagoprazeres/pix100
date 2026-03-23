export interface PerfilInterface {
  merchantName: string;
  merchantCity: string;
  pixKey: string;
  tipoChave?: 'cpf' | 'cnpj' | 'telefone' | 'email' | 'aleatoria';
}
