import { Routes } from '@angular/router';
import { Pix } from './pages/pix/pix';
import { Historico } from './pages/historico/historico';
import { Perfil } from './pages/perfil/perfil';
import { perfilGuard } from './guards/perfil-guard';
import { PixDetails } from './pages/pix-details/pix-details';

export const routes: Routes = [
  {
    path: '',
    component: Pix,
    title: 'PIX',
    canActivate: [perfilGuard],
  },
  {
    path: 'historico',
    component: Historico,
    title: 'Histórico',
    canActivate: [perfilGuard],
  },
  {
    path: 'perfil',
    component: Perfil,
    title: 'Perfil',
  },
  {
    path: 'pix/:txid',
    component: PixDetails,
    title: 'Detalhes do PIX',
    canActivate: [perfilGuard],
  }
];
