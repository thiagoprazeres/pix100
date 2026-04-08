import { ChavePix } from '../chave-pix/chave-pix.model';
import { AvisoRisco } from './risco.model';

const DIAS_CHAVE_NOVA = 30;

export function avaliarRiscoChave(chave: ChavePix): AvisoRisco[] {
  const avisos: AvisoRisco[] = [];
  const agora = Date.now();
  const diasDesdeCriacao = (agora - chave.criadaEm) / (1000 * 60 * 60 * 24);

  if (diasDesdeCriacao < DIAS_CHAVE_NOVA) {
    avisos.push({
      nivel: 'atencao',
      codigo: 'CHAVE_NOVA',
      mensagem: `Chave cadastrada há menos de ${DIAS_CHAVE_NOVA} dias. Confirme os primeiros recebimentos antes de liberar produtos automaticamente.`,
    });
  }

  if (chave.tipo === 'desconhecida') {
    avisos.push({
      nivel: 'atencao',
      codigo: 'CHAVE_DESCONHECIDA',
      mensagem: "Chave do tipo 'Desconhecida' não é validável pelo DICT. Use com cautela.",
    });
  }

  const hora = new Date().getHours();
  if (hora >= 0 && hora < 6) {
    avisos.push({
      nivel: 'info',
      codigo: 'HORARIO_ATIPICO',
      mensagem: 'Fora do horário comercial. Verifique o comprovante antes de liberar o produto ou serviço.',
    });
  }

  return avisos;
}
