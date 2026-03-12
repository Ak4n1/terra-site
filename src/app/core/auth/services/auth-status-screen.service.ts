import { DOCUMENT } from '@angular/common';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { LanguageService } from '../../i18n/language.service';
import { AuthFacadeService } from '../../../features/auth/services/auth-facade.service';
import type { AuthState } from '../../../features/auth/services/auth-facade.service';

@Injectable({ providedIn: 'root' })
export class AuthStatusScreenService {
  private static readonly AUTH_STATUS_MIN_VISIBLE_MS = 1000;

  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly authFacade = inject(AuthFacadeService);
  private readonly languageService = inject(LanguageService);

  private readonly authState = toSignal(this.authFacade.authState$, { initialValue: 'checking' as AuthState });
  private readonly sessionRateLimitRemainingSeconds = toSignal(this.authFacade.sessionRateLimitRemainingSeconds$, { initialValue: 0 });
  private readonly currentPath = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(event => event.urlAfterRedirects)
    ),
    { initialValue: this.document.location?.pathname ?? '/' }
  );

  private readonly authStatusCandidate = computed(() => {
    const path = this.currentPath();
    return path.startsWith('/dashboard') && this.authState() === 'rate-limited';
  });

  readonly authStatusOpen = signal(false);
  readonly showRouterOutlet = computed(() => !this.authStatusOpen());
  readonly authStatusTitle = computed(() => this.authState() === 'rate-limited'
    ? this.languageService.t('navSessionRetrying')
    : this.languageService.t('navSessionChecking'));
  readonly authStatusEyebrow = computed(() => this.languageService.t('navSessionRecovery'));
  readonly authStatusCopy = computed(() => this.authState() === 'rate-limited'
    ? this.languageService.t('navSessionRetryingCopy', { seconds: this.sessionRateLimitRemainingSeconds() })
    : this.languageService.t('navSessionCheckingCopy'));
  readonly authStatusLoading = computed(() => this.authState() === 'rate-limited'
    ? this.languageService.t('navSessionRetryingStatus', { seconds: this.sessionRateLimitRemainingSeconds() })
    : this.languageService.t('navSessionCheckingStatus'));
  readonly hidePublicChrome = computed(() => {
    const path = this.currentPath();
    return path.startsWith('/dashboard')
      || path.startsWith('/verify-email')
      || path.startsWith('/reset-password');
  });

  private authStatusShownAt: number | null = null;
  private authStatusHideTimerId: number | null = null;

  constructor() {
    effect(() => {
      const shouldOpen = this.authStatusCandidate();
      if (shouldOpen) {
        this.clearAuthStatusHideTimer();
        if (!this.authStatusOpen()) {
          this.authStatusOpen.set(true);
          this.authStatusShownAt = Date.now();
        }
        return;
      }

      if (!this.authStatusOpen()) {
        return;
      }

      const shownAt = this.authStatusShownAt ?? Date.now();
      const elapsed = Date.now() - shownAt;
      const remaining = AuthStatusScreenService.AUTH_STATUS_MIN_VISIBLE_MS - elapsed;

      if (remaining <= 0) {
        this.authStatusOpen.set(false);
        this.authStatusShownAt = null;
        return;
      }

      const windowRef = this.document.defaultView;
      if (!windowRef) {
        this.authStatusOpen.set(false);
        this.authStatusShownAt = null;
        return;
      }

      this.clearAuthStatusHideTimer();
      this.authStatusHideTimerId = windowRef.setTimeout(() => {
        this.authStatusHideTimerId = null;
        if (!this.authStatusCandidate()) {
          this.authStatusOpen.set(false);
          this.authStatusShownAt = null;
        }
      }, remaining);
    });
  }

  private clearAuthStatusHideTimer(): void {
    if (this.authStatusHideTimerId === null) {
      return;
    }

    this.document.defaultView?.clearTimeout(this.authStatusHideTimerId);
    this.authStatusHideTimerId = null;
  }
}

