import { Injectable } from '@angular/core';
import { FirebaseError } from 'firebase/app';
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { GoogleAuthProvider, getAuth, getRedirectResult, signInWithPopup, signInWithRedirect, signOut, type Auth, type User } from 'firebase/auth';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class FirebaseAuthService {
  private static readonly REDIRECT_PENDING_KEY = 'terra.auth.oauth.google.redirect.pending';
  private readonly provider = new GoogleAuthProvider();
  private app: FirebaseApp | null = null;

  constructor() {
    this.provider.setCustomParameters({ prompt: 'select_account' });
  }

  async signInWithGoogleIdToken(): Promise<string> {
    try {
      const auth = getAuth(this.ensureApp());
      const idToken = this.shouldUseRedirect()
        ? await this.signInWithRedirectFlow(auth)
        : await this.signInWithPopupFlow(auth);

      if (!idToken || idToken.trim().length === 0) {
        throw new Error('auth.oauthGoogleTokenMissing');
      }

      return idToken;
    } catch (error) {
      if (error instanceof FirebaseError) {
        if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
          throw new Error('auth.oauthGooglePopupCancelled');
        }

        throw new Error('auth.oauthGooglePopupFailed');
      }

      throw error;
    }
  }

  hasPendingGoogleRedirect(): boolean {
    return this.getRedirectPendingFlag();
  }

  private async signInWithPopupFlow(auth: Auth): Promise<string> {
    await this.clearExistingGoogleSession(auth);
    const credential = await signInWithPopup(auth, this.provider);
    return credential.user.getIdToken();
  }

  private async signInWithRedirectFlow(auth: Auth): Promise<string> {
    if (!this.getRedirectPendingFlag()) {
      await this.clearExistingGoogleSession(auth);
      this.setRedirectPendingFlag(true);
      await signInWithRedirect(auth, this.provider);
      throw new Error('auth.oauthGoogleRedirectInProgress');
    }

    await auth.authStateReady();
    const redirectResult = await getRedirectResult(auth);
    const redirectUser = redirectResult?.user ?? this.resolveCurrentGoogleUser(auth);
    const idToken = await redirectUser?.getIdToken();

    this.setRedirectPendingFlag(false);

    if (!idToken || idToken.trim().length === 0) {
      throw new Error('auth.oauthGooglePopupCancelled');
    }

    return idToken;
  }

  private shouldUseRedirect(): boolean {
    return environment.googleOauthFlow === 'redirect';
  }

  private async clearExistingGoogleSession(auth: Auth): Promise<void> {
    try {
      await auth.authStateReady();
      await signOut(auth);
    } catch {
      // Ignore sign-out errors and continue with auth flow.
    }
  }

  private resolveCurrentGoogleUser(auth: Auth): User | null {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return null;
    }

    const hasGoogleProvider = currentUser.providerData.some(provider => provider.providerId === 'google.com');
    return hasGoogleProvider ? currentUser : null;
  }

  private setRedirectPendingFlag(value: boolean): void {
    if (typeof window === 'undefined') {
      return;
    }

    if (value) {
      window.sessionStorage.setItem(FirebaseAuthService.REDIRECT_PENDING_KEY, '1');
      return;
    }

    window.sessionStorage.removeItem(FirebaseAuthService.REDIRECT_PENDING_KEY);
  }

  private getRedirectPendingFlag(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.sessionStorage.getItem(FirebaseAuthService.REDIRECT_PENDING_KEY) === '1';
  }

  private ensureApp(): FirebaseApp {
    if (this.app) {
      return this.app;
    }

    this.app = getApps()[0] ?? initializeApp(environment.firebase);
    return this.app;
  }
}
