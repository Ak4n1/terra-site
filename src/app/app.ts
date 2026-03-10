import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { AuthOverlayComponent, type AuthOverlayMode } from './shared/ui/organisms/auth-overlay/auth-overlay.component';
import { NavbarComponent } from './shared/ui/organisms/navbar/navbar.component';

@Component({
  selector: 'app-root',
  imports: [NavbarComponent, RouterOutlet, AuthOverlayComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly router = inject(Router);
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      startWith(null),
      map(() => this.router.url)
    ),
    { initialValue: this.router.url }
  );

  authOverlayOpen = false;
  authOverlayMode: AuthOverlayMode = 'login';
  authLoginError = '';
  readonly hidePublicChrome = computed(() => this.currentUrl().startsWith('/dashboard'));

  openAuthOverlay(mode: 'login' | 'register'): void {
    this.authOverlayMode = mode;
    this.authLoginError = '';
    this.authOverlayOpen = true;
  }

  closeAuthOverlay(): void {
    this.authLoginError = '';
    this.authOverlayOpen = false;
  }

  handleLogin(credentials: { email: string; password: string }): void {
    void credentials;
    this.authLoginError = '';
    this.authOverlayOpen = false;
    void this.router.navigateByUrl('/dashboard');
  }
}
