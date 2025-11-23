import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { PerfilService } from '../services/perfil-service';

export const perfilGuard: CanActivateFn = () => {
  const perfilService = inject(PerfilService);
  const router = inject(Router);

  if (!perfilService.perfilExiste()) {
    return router.parseUrl('/perfil');
  }

  return true;
};
