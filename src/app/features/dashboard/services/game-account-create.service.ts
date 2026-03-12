import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export type CreateGameAccountPayload = {
  accountName: string;
  password: string;
  confirmPassword: string;
};

@Injectable({ providedIn: 'root' })
export class GameAccountCreateService {
  sendEmailCode(_email: string): Observable<void> {
    return of(void 0);
  }

  verifyEmailCode(_code: string): Observable<boolean> {
    return of(true);
  }

  createGameAccount(payload: CreateGameAccountPayload): Observable<boolean> {
    const accountNameValid = payload.accountName.trim().length >= 3;
    const passwordValid = payload.password.length >= 6;
    const passwordsMatch = payload.password === payload.confirmPassword;
    return of(accountNameValid && passwordValid && passwordsMatch);
  }
}
