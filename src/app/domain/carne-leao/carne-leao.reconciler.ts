import { Cobranca } from '../cobranca/cobranca.model';
import {
  ArquivoCarneLeao,
  ItemConciliacao,
  LancamentoRecebimento,
  RelatorioConciliacao,
} from './carne-leao.model';
import { cobrancaElegivel, inferirTipoPagador } from './carne-leao.rules';

/** Chave de casamento: ano-mês-dia + valor em centavos + doc do pagador (ou vazio). */
function chave(data: Date, valor: number, doc: string): string {
  const ymd = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(
    data.getDate(),
  ).padStart(2, '0')}`;
  return `${ymd}|${Math.round(valor * 100)}|${doc}`;
}

function chaveLancamento(l: LancamentoRecebimento): string {
  const doc = (l.cpfPagador || l.cnpjPagador || '').replace(/\D/g, '');
  return chave(l.data, l.valorRecebido, doc);
}

function chaveCobranca(c: Cobranca): string {
  const doc = (c.pagador?.documento ?? '').replace(/\D/g, '');
  return chave(new Date(c.pagador!.paidAt), c.valor, doc);
}

export function reconcile(
  arquivo: ArquivoCarneLeao,
  cobrancas: Cobranca[],
): RelatorioConciliacao {
  const elegiveis = cobrancas.filter(cobrancaElegivel);
  const indiceLocal = new Map<string, Cobranca>();
  for (const c of elegiveis) indiceLocal.set(chaveCobranca(c), c);

  const jaLocal: ItemConciliacao[] = [];
  const apenasArquivo: ItemConciliacao[] = [];
  const divergentes: ItemConciliacao[] = [];

  for (const l of arquivo.recebimentos) {
    const k = chaveLancamento(l);
    const cobranca = indiceLocal.get(k);
    if (!cobranca) {
      apenasArquivo.push({ classificacao: 'apenas_arquivo', doArquivo: l });
      continue;
    }

    const diffs: string[] = [];
    const tipoLocal = inferirTipoPagador(cobranca.pagador?.documento);
    if (tipoLocal !== l.indicadorRecebidoDe) {
      diffs.push(`tipo: arquivo=${l.indicadorRecebidoDe} local=${tipoLocal}`);
    }
    if (diffs.length > 0) {
      divergentes.push({
        classificacao: 'divergente',
        doArquivo: l,
        cobrancaIdLocal: cobranca.id,
        diffs,
      });
    } else {
      jaLocal.push({
        classificacao: 'ja_local',
        doArquivo: l,
        cobrancaIdLocal: cobranca.id,
      });
    }
  }

  return {
    total: arquivo.recebimentos.length,
    jaLocal,
    apenasArquivo,
    divergentes,
  };
}
