import { inject } from '@angular/core';
import { CanActivateFn, CanActivateChildFn, Router, UrlTree } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthFacadeService } from '../services/auth-facade.service';

function ensureAuthenticated(): ReturnType<CanActivateFn> {
  const authFacade = inject(AuthFacadeService);
  const router = inject(Router);

  return authFacade.ensureAuthenticated().pipe(
    map(isAuthenticated => isAuthenticated ? true : router.createUrlTree(['/']) as UrlTree),
    catchError(() => of(router.createUrlTree(['/'])))
  );
}

export const authGuard: CanActivateFn = () => ensureAuthenticated();
export const authChildGuard: CanActivateChildFn = () => ensureAuthenticated();
