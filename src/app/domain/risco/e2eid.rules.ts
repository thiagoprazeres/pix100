import { AvisoRisco } from './risco.model';

// E2EId: E + ISPB(8) + YYYYMMDD(8) + HHmm(4) + random(11) = 32 chars
const E2EID_REGEX = /^E\d{20}[A-Za-z0-9]{11}$/;
const TOLERANCIA_MS = 24 * 60 * 60 * 1000;

export function validarFormatoE2EId(valor: string): boolean {
  return E2EID_REGEX.test(valor.trim());
}

export function extrairDataE2EId(valor: string): Date | null {
  const v = valor.trim();
  if (!E2EID_REGEX.test(v)) return null;
  const datePart = v.slice(9, 17);   // YYYYMMDD
  const timePart = v.slice(17, 21);  // HHmm
  const year   = parseInt(datePart.slice(0, 4), 10);
  const month  = parseInt(datePart.slice(4, 6), 10) - 1;
  const day    = parseInt(datePart.slice(6, 8), 10);
  const hour   = parseInt(timePart.slice(0, 2), 10);
  const minute = parseInt(timePart.slice(2, 4), 10);
  const d = new Date(Date.UTC(year, month, day, hour, minute));
  return isNaN(d.getTime()) ? null : d;
}

export function avaliarRiscoE2EId(e2eid: string, paidAt: number): AvisoRisco[] {
  const avisos: AvisoRisco[] = [];
  const v = e2eid.trim();
  if (!v) return avisos;

  if (!validarFormatoE2EId(v)) {
    avisos.push({
      nivel: 'atencao',
      codigo: 'E2EID_FORMATO',
      mensagem: "Formato inválido. O ID da transação deve começar com 'E' seguido de 32 caracteres alfanuméricos.",
    });
    return avisos;
  }

  const dataE2EId = extrairDataE2EId(v);
  if (dataE2EId) {
    const diffMs = Math.abs(paidAt - dataE2EId.getTime());
    if (diffMs > TOLERANCIA_MS) {
      avisos.push({
        nivel: 'atencao',
        codigo: 'E2EID_DATA_DIVERGENTE',
        mensagem: `A data embutida no ID (${dataE2EId.toLocaleDateString('pt-BR')}) não coincide com a data do pagamento informada. Verifique o comprovante.`,
      });
    }
  }

  return avisos;
}
