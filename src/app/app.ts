import { Component, inject, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { CheckCircle2 } from 'lucide-angular';
import { firstValueFrom } from 'rxjs';
import { LanguageService } from './core/i18n/language.service';
import { AuthStatusScreenService } from './core/auth/services/auth-status-screen.service';
import { NotificationsStore } from './core/notifications/notifications.store';
import { RealtimeService } from './core/realtime/realtime.service';
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
  private readonly router = inject(Router);
  private readonly authFacade = inject(AuthFacadeService);
  private readonly authStatusScreenService = inject(AuthStatusScreenService);
  private readonly languageService = inject(LanguageService);
  private readonly realtimeService = inject(RealtimeService);
  private readonly notificationsStore = inject(NotificationsStore);
  private readonly toastService = inject(ToastService);

  readonly authOverlayOpen = signal(false);
  readonly authOverlayMode = signal<AuthOverlayMode>('login');
  readonly authStatusOpen = this.authStatusScreenService.authStatusOpen;
  readonly showRouterOutlet = this.authStatusScreenService.showRouterOutlet;
  readonly authStatusTitle = this.authStatusScreenService.authStatusTitle;
  readonly authStatusEyebrow = this.authStatusScreenService.authStatusEyebrow;
  readonly authStatusCopy = this.authStatusScreenService.authStatusCopy;
  readonly authStatusLoading = this.authStatusScreenService.authStatusLoading;
  readonly hidePublicChrome = this.authStatusScreenService.hidePublicChrome;

  constructor() {
    void this.realtimeService;
    void this.notificationsStore;
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
