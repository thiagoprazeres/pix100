import { Cobranca } from './cobranca.model';

export function gerarTicketBase64(c: Cobranca): Promise<string> {
  return new Promise((resolve, reject) => {
    const qrSrc = c.qrSvg ?? c.qrBase64;
    if (!qrSrc) return reject(new Error('Cobrança sem imagem QR.'));

    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');
    if (!ctx) return reject('Sem contexto 2D');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, 140);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 38px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAGAMENTO PIX', canvas.width / 2, 85);
    ctx.fillStyle = '#334155';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText(c.snapshot.merchantName.toUpperCase(), canvas.width / 2, 200);
    ctx.fillStyle = '#64748b';
    ctx.font = '22px sans-serif';
    ctx.fillText(c.snapshot.merchantCity, canvas.width / 2, 235);
    const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
    ctx.fillStyle = '#16a34a';
    ctx.font = '900 68px sans-serif';
    ctx.fillText(fmt.format(c.valor), canvas.width / 2, 310);
    if (c.descricao) {
      ctx.fillStyle = '#64748b';
      ctx.font = 'italic 24px sans-serif';
      ctx.fillText(`"${c.descricao}"`, canvas.width / 2, 355);
    }
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 130, 380, 340, 340);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '16px sans-serif';
      ctx.fillText('Gerado com Origem100', canvas.width / 2, canvas.height - 40);
      ctx.fillText(`Ref: ${c.brCodeRef}`, canvas.width / 2, canvas.height - 20);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = qrSrc;
  });
}

export async function gerarPdf(c: Cobranca): Promise<void> {
  const ticketBase64 = await gerarTicketBase64(c);
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const imgW = 100;
  const imgH = (800 / 600) * imgW;
  const x = (pageW - imgW) / 2;
  doc.addImage(ticketBase64, 'PNG', x, 20, imgW, imgH);
  doc.save(`pix-recibo-${c.brCodeRef}.pdf`);
}

export function base64ToFile(base64: string, filename: string): File {
  const arr = base64.split(',');
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8 = new Uint8Array(n);
  while (n--) u8[n] = bstr.charCodeAt(n);
  return new File([u8], filename, { type: 'image/png' });
}
