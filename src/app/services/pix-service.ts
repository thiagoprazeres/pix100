import { Injectable, signal } from '@angular/core';
import { createStaticPix } from 'pix-utils';
import { PerfilService } from './perfil-service';
import { PixInterface } from '../interfaces/pix-interface';
import { CreateStaticPixParams } from 'pix-utils/dist/main/types/pixCreate';
import { PixGerado } from '../interfaces/pix-gerado';

const STORAGE_KEY = 'pix100.historico.v1';

@Injectable({ providedIn: 'root' })
export class PixService {
  private readonly _historico = signal<PixGerado[]>(this.loadHistorico());

  readonly historico = this._historico.asReadonly();

  constructor(private perfilService: PerfilService) {}

  async gerarPix(dados: PixInterface): Promise<PixGerado> {
    const perfil = this.perfilService.perfil();

    if (!perfil) {
      throw new Error('Perfil não configurado.');
    }

    const txid = this.gerarTxidSeguro();

    const params: CreateStaticPixParams = {
      merchantName: perfil.merchantName,
      merchantCity: this.sanitizeCity(perfil.merchantCity),
      pixKey: perfil.pixKey,
      infoAdicional: dados.infoAdicional,
      transactionAmount: dados.transactionAmount,
      txid,
      isTransactionUnique: true,
    };

    const payload = createStaticPix(params).throwIfError();
    const qrBase64 = await payload.toImage();
    console.log('Payload gerado:', payload);

    const registro: PixGerado = {
      txid,
      payload,
      amount: dados.transactionAmount,
      infoAdicional: dados.infoAdicional,
      brcode: payload.toBRCode(),
      qrBase64: qrBase64,
      createdAt: Date.now(),
    };

    this.salvarHistorico(registro);

    return registro;
  }

  // -----------------------------------------------------
  // HISTÓRICO (unifica PixStorageService)
  // -----------------------------------------------------
  private salvarHistorico(item: PixGerado) {
    const atual = this._historico();
    const novo = [item, ...atual];

    localStorage.setItem(STORAGE_KEY, JSON.stringify(novo));
    this._historico.set(novo);
  }

  private loadHistorico(): PixGerado[] {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  limparHistorico() {
    localStorage.removeItem(STORAGE_KEY);
    this._historico.set([]);
  }

  buscarPorTxid(txid: string): PixGerado | undefined {
    return this._historico().find((p) => p.txid === txid);
  }

  // -----------------------------------------------------
  // UTILITÁRIOS
  // -----------------------------------------------------
  private gerarTxidSeguro(): string {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 25);
  }

  private sanitizeCity(city: string): string {
    return city
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();
  }
}
