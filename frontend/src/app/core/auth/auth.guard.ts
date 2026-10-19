
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { Role } from '../../shared/model/auth.models';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url },
    });
  }

  return true;
};

export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    return router.createUrlTree(['/login']);
  }

  const allowedRoles = route.data['roles'] as Role[] | undefined;
  const currentRole = auth.role();

  if (!currentRole) {
    return router.createUrlTree(['/login']);
  }

  if (allowedRoles && !allowedRoles.includes(currentRole)) {
    return router.createUrlTree([auth.homeFor(currentRole)]);
  }

  return true;
};
