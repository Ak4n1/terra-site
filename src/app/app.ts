import { DOCUMENT } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { CheckCircle2 } from 'lucide-angular';
import { firstValueFrom } from 'rxjs';
import { filter, map } from 'rxjs';
import { LanguageService } from './core/i18n/language.service';
import { AuthFacadeService } from './features/auth/services/auth-facade.service';
import type { AuthOverlayMode } from './shared/ui/organisms/auth-overlay/auth-overlay.component';
import { AuthOverlayContainerComponent } from './features/auth/containers/auth-overlay-container.component';
import { NavbarComponent } from './shared/ui/organisms/navbar/navbar.component';
import { ToastOutletComponent } from './shared/ui/organisms/toast-outlet/toast-outlet.component';
import { ToastService } from './shared/ui/services/toast.service';

@Component({
  selector: 'app-root',
  imports: [NavbarComponent, RouterOutlet, AuthOverlayContainerComponent, ToastOutletComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly authFacade = inject(AuthFacadeService);
  private readonly languageService = inject(LanguageService);
  private readonly toastService = inject(ToastService);
  private readonly currentPath = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(event => event.urlAfterRedirects)
    ),
    { initialValue: this.document.location?.pathname ?? '/' }
  );

  readonly authOverlayOpen = signal(false);
  readonly authOverlayMode = signal<AuthOverlayMode>('login');
  readonly hidePublicChrome = computed(() => {
    const path = this.currentPath();
    return path.startsWith('/dashboard')
      || path.startsWith('/verify-email')
      || path.startsWith('/reset-password');
  });

  constructor() {
    void firstValueFrom(this.authFacade.bootstrapSession());
  }

  openAuthOverlay(mode: 'login' | 'register'): void {
    this.authOverlayMode.set(mode);
    this.authOverlayOpen.set(true);
  }

  closeAuthOverlay(): void {
    this.authOverlayOpen.set(false);
  }

  async handleLoginCompleted(): Promise<void> {
    const email = this.authFacade.sessionSnapshot?.user.email;
    if (email) {
      this.toastService.success(
        this.languageService.t('toastWelcomeBack', { email }),
        { icon: CheckCircle2, durationMs: 3600 }
      );
    }

    this.authOverlayOpen.set(false);
    await this.router.navigateByUrl('/dashboard');
  }
}
