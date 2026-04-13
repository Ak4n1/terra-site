import { Injectable, signal } from '@angular/core';
import type { AuthOverlayMode } from '../../../shared/ui/organisms/auth-overlay/auth-overlay.component';

type AuthOverlayEntryMode = 'login' | 'register';

@Injectable({ providedIn: 'root' })
export class AuthOverlayStateService {
  readonly isOpen = signal(false);
  readonly mode = signal<AuthOverlayMode>('login');

  open(mode: AuthOverlayEntryMode): void {
    this.mode.set(mode);
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }
}
