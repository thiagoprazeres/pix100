import { Routes } from '@angular/router';
import { perfilGuard } from './guards/perfil-guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'cobranca',
    pathMatch: 'full',
  },
  {
    path: 'cobranca',
    loadComponent: () => import('./pages/pix/pix').then((m) => m.Pix),
    title: 'Nova Cobrança',
    canActivate: [perfilGuard],
  },
  {
    path: 'cobranca/:id',
    loadComponent: () => import('./pages/pix-details/pix-details').then((m) => m.PixDetails),
    title: 'Detalhes da Cobrança',
    canActivate: [perfilGuard],
  },
  {
    path: 'historico',
    loadComponent: () => import('./pages/historico/historico').then((m) => m.Historico),
    title: 'Histórico',
    canActivate: [perfilGuard],
  },
  {
    path: 'chaves',
    loadComponent: () => import('./pages/chaves/chaves').then((m) => m.Chaves),
    title: 'Chaves Pix',
    canActivate: [perfilGuard],
  },
  {
    path: 'chaves/:id',
    loadComponent: () =>
      import('./pages/chaves-details/chaves-details').then((m) => m.ChavesDetails),
    title: 'Detalhes da Chave',
    canActivate: [perfilGuard],
  },
  {
    path: 'perfil',
    loadComponent: () => import('./pages/perfil/perfil').then((m) => m.Perfil),
    title: 'Perfil',
  },
  {
    path: 'pix/:txid',
    redirectTo: 'historico',
  },
  {
    path: '**',
    redirectTo: 'cobranca',
  },
];
