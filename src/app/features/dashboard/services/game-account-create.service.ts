import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, timeout } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { ApiResponse } from '../../auth/models/api-response.model';

export type CreateGameAccountPayload = {
  accountName: string;
  password: string;
  verificationToken: string;
};

export type VerifyEmailCodeResult = {
  verificationToken: string;
  expiresInSeconds: number;
};

export type CreateGameAccountResult = {
  accountName: string;
  email: string;
  createdAt: string;
};

@Injectable({ providedIn: 'root' })
export class GameAccountCreateService {
  private static readonly REQUEST_TIMEOUT_MS = 15000;
  private readonly http = inject(HttpClient);
  private readonly gameAccountsUrl = `${environment.apiBaseUrl}/api/game-accounts`;

  sendEmailCode(_email: string): Observable<void> {
    return this.http.post<ApiResponse<null>>(this.endpoint('/create-code'), {}).pipe(
      timeout(GameAccountCreateService.REQUEST_TIMEOUT_MS),
      map(() => void 0)
    );
  }

  verifyEmailCode(code: string): Observable<VerifyEmailCodeResult> {
    return this.http.post<ApiResponse<VerifyEmailCodeResult>>(this.endpoint('/verify-code'), { code }).pipe(
      timeout(GameAccountCreateService.REQUEST_TIMEOUT_MS),
      map(response => {
        if (!response.data) {
          throw new Error('Missing verify-code payload');
        }
        return response.data;
      })
    );
  }

  createGameAccount(payload: CreateGameAccountPayload): Observable<CreateGameAccountResult> {
    const headers = new HttpHeaders({
      'Idempotency-Key': this.generateIdempotencyKey()
    });
    return this.http.post<ApiResponse<CreateGameAccountResult>>(this.endpoint(''), payload, { headers }).pipe(
      timeout(GameAccountCreateService.REQUEST_TIMEOUT_MS),
      map(response => {
        if (!response.data) {
          throw new Error('Missing create-account payload');
        }
        return response.data;
      })
    );
  }

  private endpoint(path: string): string {
    return `${this.gameAccountsUrl}${path}`;
  }

  private generateIdempotencyKey(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `game-create-${crypto.randomUUID()}`;
    }
    return `game-create-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  }
}
