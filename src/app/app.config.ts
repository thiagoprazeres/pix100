import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  isDevMode,
  LOCALE_ID,
  DEFAULT_CURRENCY_CODE,
  APP_INITIALIZER,
  inject,
} from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular/standalone';

import { routes } from './app.routes';
import { provideServiceWorker } from '@angular/service-worker';
import { StoragePort } from './infrastructure/storage/storage.port';
import { IdbStorage } from './infrastructure/storage/idb.storage';
import { MigrationService } from './infrastructure/storage/migration.service';
import { PerfilService } from './application/perfil.service';
import { ChavePixService } from './application/chave-pix.service';
import { CobrancaService } from './application/cobranca.service';

import ptBr from '@angular/common/locales/pt';
import { registerLocaleData } from '@angular/common';

registerLocaleData(ptBr, 'pt-BR');

function initializeApp(): () => Promise<void> {
  const migration = inject(MigrationService);
  const perfilService = inject(PerfilService);
  const chavePixService = inject(ChavePixService);
  const cobrancaService = inject(CobrancaService);

  return async () => {
    perfilService.registerDependentServices(chavePixService, cobrancaService);
    await migration.runIfNeeded();
    await perfilService.init();
    const perfil = perfilService.perfil();
    if (perfil) {
      await chavePixService.init(perfil.id);
      await cobrancaService.init(perfil.id);
    }
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideIonicAngular({ mode: 'md' }),
    provideRouter(routes, withViewTransitions()),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    { provide: LOCALE_ID, useValue: 'pt-BR' },
    { provide: DEFAULT_CURRENCY_CODE, useValue: 'BRL' },
    { provide: StoragePort, useExisting: IdbStorage },
    { provide: APP_INITIALIZER, useFactory: initializeApp, multi: true },
  ],
};
