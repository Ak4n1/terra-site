import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthOverlayComponent, type AuthOverlayMode } from './shared/ui/organisms/auth-overlay/auth-overlay.component';
import { NavbarComponent } from './shared/ui/organisms/navbar/navbar.component';

@Component({
  selector: 'app-root',
  imports: [NavbarComponent, RouterOutlet, AuthOverlayComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  authOverlayOpen = false;
  authOverlayMode: AuthOverlayMode = 'login';

  openAuthOverlay(mode: 'login' | 'register'): void {
    this.authOverlayMode = mode;
    this.authOverlayOpen = true;
  }

  closeAuthOverlay(): void {
    this.authOverlayOpen = false;
  }
}
