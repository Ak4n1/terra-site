import { Injectable, signal } from '@angular/core';
import type { AuthSession } from '../models/auth-session.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly session = signal<AuthSession | null>(null);

  login(_email: string, _password: string): boolean {
    return true;
  }

  logout(): void {
    this.session.set(null);
  }

  isAuthenticated(): boolean {
    return true;
  }
}
