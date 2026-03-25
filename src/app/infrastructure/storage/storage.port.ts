import { Perfil } from '../../domain/perfil/perfil.model';
import { ChavePix } from '../../domain/chave-pix/chave-pix.model';
import { Cobranca } from '../../domain/cobranca/cobranca.model';
import { EventoConciliacao } from '../../domain/conciliacao/evento-conciliacao.model';

export abstract class StoragePort {
  abstract getPerfil(): Promise<Perfil | undefined>;
  abstract savePerfil(perfil: Perfil): Promise<void>;
  abstract deletePerfil(): Promise<void>;

  abstract getChaves(perfilId: string): Promise<ChavePix[]>;
  abstract getChave(id: string): Promise<ChavePix | undefined>;
  abstract saveChave(chave: ChavePix): Promise<void>;
  abstract deleteChave(id: string): Promise<void>;

  abstract getCobrancas(perfilId: string): Promise<Cobranca[]>;
  abstract getCobranca(id: string): Promise<Cobranca | undefined>;
  abstract saveCobranca(cobranca: Cobranca): Promise<void>;

  abstract getEventos(cobrancaId: string): Promise<EventoConciliacao[]>;
  abstract getEventoPorIdempotencyKey(key: string): Promise<EventoConciliacao | undefined>;
  abstract saveEvento(evento: EventoConciliacao): Promise<void>;

  abstract chaveUsadaEmCobranca(chaveId: string): Promise<boolean>;
  abstract clearProfileData(perfilId: string): Promise<void>;
}
