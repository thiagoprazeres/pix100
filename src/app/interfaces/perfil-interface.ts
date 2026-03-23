export interface PerfilInterface {
  id: string;
  titulo: string;
  merchantName: string;
  merchantCity: string;
  pixKey: string;
  tipoChave?: 'cpf' | 'cnpj' | 'telefone' | 'email' | 'aleatoria';
}
