import { TipoEvento } from './evento-conciliacao.model';
import { StatusCobranca } from '../cobranca/cobranca.model';

export function gerarIdempotencyKey(
  cobrancaId: string,
  tipo: TipoEvento,
  timestamp: number
): string {
  const janela = Math.floor(timestamp / 60_000);
  return `${cobrancaId}:${tipo}:${janela}`;
}

export function tipoEventoParaStatus(
  statusAtual: StatusCobranca,
  tipo: TipoEvento
): StatusCobranca {
  switch (tipo) {
    case 'criada':
      return 'pendente';
    case 'confirmada_manualmente':
      return 'paga';
    case 'desconfirmada':
      return 'pendente';
    case 'expirada_automaticamente':
      return 'expirada';
    case 'cancelada':
      return 'cancelada';
  }
}
