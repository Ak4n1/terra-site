import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { filter, map, startWith } from 'rxjs';
import type { AuthOverlayMode } from './shared/ui/organisms/auth-overlay/auth-overlay.component';
import { NavbarComponent } from './shared/ui/organisms/navbar/navbar.component';
import { AuthOverlayContainerComponent } from './features/auth/containers/auth-overlay-container.component';
import { AuthFacadeService } from './features/auth/services/auth-facade.service';

@Component({
  selector: 'app-root',
  imports: [NavbarComponent, RouterOutlet, AuthOverlayContainerComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly router = inject(Router);
  private readonly authFacade = inject(AuthFacadeService);
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      startWith(null),
      map(() => this.router.url)
    ),
    { initialValue: this.router.url }
  );

  readonly authOverlayOpen = signal(false);
  readonly authOverlayMode = signal<AuthOverlayMode>('login');
  readonly hidePublicChrome = computed(() => this.currentUrl().startsWith('/dashboard'));

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
    this.authOverlayOpen.set(false);
    await this.router.navigateByUrl('/dashboard');
  }
}
