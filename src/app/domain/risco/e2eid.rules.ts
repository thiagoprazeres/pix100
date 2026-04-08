import { isValidE2EId, parseE2EId } from '@thiagoprazeres/parse-e2eid';
import { AvisoRisco } from './risco.model';

const TOLERANCIA_MS = 24 * 60 * 60 * 1000;

export function validarFormatoE2EId(valor: string): boolean {
  return isValidE2EId(valor.trim());
}

export function avaliarRiscoE2EId(e2eid: string, paidAt: number): AvisoRisco[] {
  const avisos: AvisoRisco[] = [];
  const v = e2eid.trim();
  if (!v) return avisos;

  if (!isValidE2EId(v)) {
    avisos.push({
      nivel: 'atencao',
      codigo: 'E2EID_FORMATO',
      mensagem: "Formato inválido. O ID da transação deve começar com 'E' seguido de 32 caracteres alfanuméricos.",
    });
    return avisos;
  }

  try {
    const parsed = parseE2EId(v);
    const diffMs = Math.abs(paidAt - parsed.initiatedAt.getTime());
    if (diffMs > TOLERANCIA_MS) {
      avisos.push({
        nivel: 'atencao',
        codigo: 'E2EID_DATA_DIVERGENTE',
        mensagem: `A data embutida no ID (${parsed.initiatedAt.toLocaleDateString('pt-BR')}) não coincide com a data do pagamento informada. Verifique o comprovante.`,
      });
    }
  } catch {
    // parse error after validation — no additional check
  }

  return avisos;
}
