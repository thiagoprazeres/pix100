export type NivelRisco = 'info' | 'atencao';

export interface AvisoRisco {
  nivel: NivelRisco;
  codigo: string;
  mensagem: string;
}
