import { Injectable } from '@angular/core';
import { FirebaseError } from 'firebase/app';
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { GoogleAuthProvider, getAuth, signInWithPopup, signOut, type Auth } from 'firebase/auth';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class FirebaseAuthService {
  private readonly provider = new GoogleAuthProvider();
  private app: FirebaseApp | null = null;

  constructor() {
    this.provider.setCustomParameters({ prompt: 'select_account' });
  }

  async signInWithGoogleIdToken(): Promise<string> {
    try {
      const auth = getAuth(this.ensureApp());
      const idToken = await this.signInWithPopupFlow(auth);

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

  private async signInWithPopupFlow(auth: Auth): Promise<string> {
    await this.clearExistingGoogleSession(auth);
    const credential = await signInWithPopup(auth, this.provider);
    return credential.user.getIdToken();
  }

  private async clearExistingGoogleSession(auth: Auth): Promise<void> {
    try {
      await auth.authStateReady();
      await signOut(auth);
    } catch {
      // Ignore sign-out errors and continue with auth flow.
    }
  }

  private ensureApp(): FirebaseApp {
    if (this.app) {
      return this.app;
    }

    this.app = getApps()[0] ?? initializeApp(environment.firebase);
    return this.app;
  }
}
