import { Injectable, signal, computed } from '@angular/core';
import { StoragePort } from '../infrastructure/storage/storage.port';
import { ChavePix, TipoChave, TipoPessoa, StatusChave } from '../domain/chave-pix/chave-pix.model';
import { normalizarChave, derivarTipoPessoa } from '../domain/chave-pix/chave-pix.normalizer';
import { validarValorPorTipo, verificarUnicidade, podeArquivar, podeRemoverFisicamente } from '../domain/chave-pix/chave-pix.rules';

@Injectable({ providedIn: 'root' })
export class ChavePixService {
  private readonly _chaves = signal<ChavePix[]>([]);

  readonly chaves = this._chaves.asReadonly();
  readonly chaveAtiva = computed(() => this._chaves().find((c) => c.status === 'ativa') ?? null);

  constructor(private storage: StoragePort) {}

  async init(perfilId: string): Promise<void> {
    const chaves = await this.storage.getChaves(perfilId);
    this._chaves.set(chaves);
  }

  async cadastrar(params: {
    perfilId: string;
    tipo: TipoChave;
    valor: string;
    tipoPessoa?: TipoPessoa;
    banco?: string;
    nomeBanco?: string;
  }): Promise<ChavePix> {
    const valor = normalizarChave(params.valor, params.tipo);

    const erroValidacao = validarValorPorTipo(params.valor, params.tipo);
    if (erroValidacao) throw new Error(erroValidacao);

    const chaves = this._chaves();
    if (!verificarUnicidade(chaves, valor)) {
      throw new Error('Esta chave já está cadastrada neste perfil');
    }

    const tipoPessoa = params.tipoPessoa ?? derivarTipoPessoa(params.tipo) ?? 'PF';
    const jaTemAtiva = chaves.some((c) => c.status === 'ativa');
    const now = Date.now();

    const chave: ChavePix = {
      id: crypto.randomUUID(),
      perfilId: params.perfilId,
      tipo: params.tipo,
      valor,
      tipoPessoa,
      status: jaTemAtiva ? 'inativa' : 'ativa',
      verificacaoStatus: 'nao_verificada',
      criadaEm: now,
      ...(params.banco && { banco: params.banco }),
      ...(params.nomeBanco && { nomeBanco: params.nomeBanco }),
    };

    await this.storage.saveChave(chave);
    this._chaves.set([...chaves, chave]);
    return chave;
  }

  async ativar(id: string): Promise<void> {
    const chaves = this._chaves();
    const alvo = chaves.find((c) => c.id === id);
    if (!alvo) throw new Error('Chave não encontrada');
    if (alvo.status === 'arquivada') throw new Error('Chave arquivada não pode ser ativada');

    const atualizadas: ChavePix[] = [];
    for (const c of chaves) {
      if (c.id === id) {
        const updated = { ...c, status: 'ativa' as StatusChave };
        await this.storage.saveChave(updated);
        atualizadas.push(updated);
      } else if (c.status === 'ativa') {
        const updated = { ...c, status: 'inativa' as StatusChave };
        await this.storage.saveChave(updated);
        atualizadas.push(updated);
      } else {
        atualizadas.push(c);
      }
    }
    this._chaves.set(atualizadas);
  }

  async arquivar(id: string): Promise<void> {
    const chaves = this._chaves();
    const alvo = chaves.find((c) => c.id === id);
    if (!alvo) throw new Error('Chave não encontrada');
    if (!podeArquivar(alvo)) throw new Error('Esta chave já está arquivada');

    const now = Date.now();
    const updated: ChavePix = { ...alvo, status: 'arquivada', arquivadaEm: now };
    await this.storage.saveChave(updated);
    this._chaves.set(chaves.map((c) => (c.id === id ? updated : c)));
  }

  async remover(id: string): Promise<void> {
    const chaves = this._chaves();
    const alvo = chaves.find((c) => c.id === id);
    if (!alvo) throw new Error('Chave não encontrada');

    const usada = await this.storage.chaveUsadaEmCobranca(id);
    if (!podeRemoverFisicamente(alvo, usada)) {
      throw new Error('Chave já utilizada em cobranças. Use "Arquivar" em vez de remover.');
    }

    await this.storage.deleteChave(id);
    this._chaves.set(chaves.filter((c) => c.id !== id));
  }

  reset(): void {
    this._chaves.set([]);
  }

  async marcarConfirmadaPorRecebimento(id: string): Promise<void> {
    const chaves = this._chaves();
    const alvo = chaves.find((c) => c.id === id);
    if (!alvo) return;
    if (alvo.verificacaoStatus === 'confirmada_por_recebimento') return;

    const updated: ChavePix = { ...alvo, verificacaoStatus: 'confirmada_por_recebimento' };
    await this.storage.saveChave(updated);
    this._chaves.set(chaves.map((c) => (c.id === id ? updated : c)));
  }
}
