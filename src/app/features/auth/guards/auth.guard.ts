import { inject } from '@angular/core';
import { CanActivateFn, CanActivateChildFn, CanMatchFn, Route, Router, UrlSegment, UrlTree } from '@angular/router';
import { catchError, filter, map, of, switchMap, take, timeout } from 'rxjs';
import { AuthFacadeService } from '../services/auth-facade.service';

function ensureAuthenticated$() {
  const authFacade = inject(AuthFacadeService);
  const router = inject(Router);

  return authFacade.bootstrapSession().pipe(
    switchMap(() => authFacade.authState$),
    filter(state => state === 'authenticated' || state === 'unauthenticated'),
    take(1),
    timeout({ first: 80000 }),
    map(state => state === 'authenticated' ? true : router.createUrlTree(['/']) as UrlTree),
    catchError(() => of(router.createUrlTree(['/'])))
  );
}

export const authGuard: CanActivateFn = () => ensureAuthenticated$();
export const authChildGuard: CanActivateChildFn = () => ensureAuthenticated$();
export const authMatchGuard: CanMatchFn = (_route: Route, _segments: UrlSegment[]) => ensureAuthenticated$();
