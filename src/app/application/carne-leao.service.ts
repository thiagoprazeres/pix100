import { Injectable, inject } from '@angular/core';
import { CobrancaService } from './cobranca.service';
import { PerfilService } from './perfil.service';
import { BancoService } from '../shared/services/banco.service';
import {
  cobrancaElegivel,
  cobrancaParaLancamento,
  noMesAno,
} from '../domain/carne-leao/carne-leao.rules';
import { serialize } from '../domain/carne-leao/carne-leao.serializer';
import { parse } from '../domain/carne-leao/carne-leao.parser';
import { reconcile } from '../domain/carne-leao/carne-leao.reconciler';
import {
  ArquivoCarneLeao,
  LancamentoRecebimento,
  RelatorioConciliacao,
} from '../domain/carne-leao/carne-leao.model';
import { Cobranca } from '../domain/cobranca/cobranca.model';

export interface PreviaExportacao {
  ano: number;
  mes: number;
  cobrancas: Cobranca[];
  lancamentos: LancamentoRecebimento[];
}

@Injectable({ providedIn: 'root' })
export class CarneLeaoService {
  private perfilService = inject(PerfilService);
  private cobrancaService = inject(CobrancaService);
  private bancoService = inject(BancoService);

  /** Lista lançamentos elegíveis do mês escolhido (preview). */
  preverMes(ano: number, mes1a12: number): PreviaExportacao {
    const perfil = this.perfilService.perfil();
    if (!perfil) throw new Error('Perfil não configurado.');
    if (!perfil.ocupacao)
      throw new Error('Configure sua Ocupação no perfil antes de exportar.');
    if (!perfil.cpf) throw new Error('CPF do titular é obrigatório no perfil.');

    const cobrancas = this.cobrancaService
      .cobrancas()
      .filter((c) => cobrancaElegivel(c) && noMesAno(c, ano, mes1a12));

    const lancamentos = cobrancas.map((c) =>
      cobrancaParaLancamento(
        c,
        { cpf: perfil.cpf!, ocupacao: perfil.ocupacao! },
        { nomeBancoPagador: this.nomeBancoDaCobranca(c) },
      ),
    );
    return { ano, mes: mes1a12, cobrancas, lancamentos };
  }

  private nomeBancoDaCobranca(c: Cobranca): string | undefined {
    if (c.pagador?.nomeBanco) return c.pagador.nomeBanco;
    const e2e = c.pagador?.endToEndId;
    if (!e2e) return undefined;
    const ispb = this.bancoService.extrairISPBDoE2EId(e2e);
    return ispb ? this.bancoService.resolverPorISPB(ispb)?.nomeReduzido : undefined;
  }

  /** Gera o arquivo .txt do mês. */
  exportarMes(ano: number, mes1a12: number): { blob: Blob; nomeArquivo: string } {
    const perfil = this.perfilService.perfil()!;
    const previa = this.preverMes(ano, mes1a12);
    const arquivo: ArquivoCarneLeao = {
      cpfTitular: (perfil.cpf ?? '').replace(/\D/g, ''),
      recebimentos: previa.lancamentos,
    };
    const texto = serialize(arquivo);
    const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' });
    const nomeArquivo = `carne-leao-${ano}-${String(mes1a12).padStart(2, '0')}.txt`;
    return { blob, nomeArquivo };
  }

  /** Lê arquivo, faz parse e reconcilia com cobranças locais. */
  async importarArquivo(file: File): Promise<RelatorioConciliacao> {
    const texto = await file.text();
    const arquivo = parse(texto);
    const cobrancas = this.cobrancaService.cobrancas();
    return reconcile(arquivo, cobrancas);
  }
}
