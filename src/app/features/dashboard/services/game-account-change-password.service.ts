import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, timeout } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { ApiResponse } from '../../auth/models/api-response.model';

export type GameAccountSummary = {
  login: string;
  email: string;
  createdTime: string;
  lastActive: string;
  characters: number;
  hasNoCharacters: boolean;
};

export type VerifyChangePasswordCodeResult = {
  verificationToken: string;
  expiresInSeconds: number;
};

export type ChangeGamePasswordPayload = {
  accountName: string;
  newPassword: string;
  confirmPassword: string;
  verificationToken: string;
};

@Injectable({ providedIn: 'root' })
export class GameAccountChangePasswordService {
  private static readonly REQUEST_TIMEOUT_MS = 15000;
  private readonly http = inject(HttpClient);
  private readonly gameAccountsUrl = `${environment.apiBaseUrl}/api/game-accounts`;

  listAccounts(): Observable<GameAccountSummary[]> {
    return this.http.get<ApiResponse<unknown[]>>(this.endpoint('')).pipe(
      timeout(GameAccountChangePasswordService.REQUEST_TIMEOUT_MS),
      map(response => this.normalizeAccountsPayload(response.data))
    );
  }

  sendEmailCode(accountName: string): Observable<void> {
    return this.http.post<ApiResponse<null>>(this.endpoint('/change-password/code'), { accountName }).pipe(
      timeout(GameAccountChangePasswordService.REQUEST_TIMEOUT_MS),
      map(() => void 0)
    );
  }

  verifyEmailCode(accountName: string, code: string): Observable<VerifyChangePasswordCodeResult> {
    return this.http.post<ApiResponse<VerifyChangePasswordCodeResult>>(this.endpoint('/change-password/verify'), {
      accountName,
      code
    }).pipe(
      timeout(GameAccountChangePasswordService.REQUEST_TIMEOUT_MS),
      map(response => {
        if (!response.data) {
          throw new Error('Missing change-password verify payload');
        }
        return response.data;
      })
    );
  }

  changePassword(payload: ChangeGamePasswordPayload): Observable<void> {
    const headers = new HttpHeaders({
      'Idempotency-Key': this.generateIdempotencyKey()
    });

    return this.http.post<ApiResponse<null>>(this.endpoint('/change-password'), payload, { headers }).pipe(
      timeout(GameAccountChangePasswordService.REQUEST_TIMEOUT_MS),
      map(() => void 0)
    );
  }

  private endpoint(path: string): string {
    return `${this.gameAccountsUrl}${path}`;
  }

  private normalizeAccountsPayload(data: unknown[] | null): GameAccountSummary[] {
    if (!Array.isArray(data)) {
      return [];
    }

    return data
      .map(item => this.normalizeAccount(item))
      .filter((item): item is GameAccountSummary => item !== null);
  }

  private normalizeAccount(value: unknown): GameAccountSummary | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const source = value as Record<string, unknown>;
    const login = this.readString(source['login']) ?? this.readString(source['accountName']) ?? '';
    if (login.trim().length === 0) {
      return null;
    }

    const email = this.readString(source['email']) ?? '';
    const createdTime = this.readString(source['createdTime']) ?? this.readString(source['createdAt']) ?? '-';
    const lastActive = this.readString(source['lastActive']) ?? this.readString(source['lastActiveAt']) ?? '-';
    const rawCharactersCount =
      this.readNumber(source['characters']) ??
      this.readNumber(source['charactersCount']) ??
      this.readNumber(source['characterCount']) ??
      0;
    const characters = Math.max(0, rawCharactersCount);
    const hasNoCharacters = Boolean(source['hasNoCharacters'] === true || characters === 0);

    return {
      login,
      email,
      createdTime,
      lastActive,
      characters,
      hasNoCharacters
    };
  }

  private readString(value: unknown): string | null {
    return typeof value === 'string' ? value : null;
  }

  private readNumber(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }

  private generateIdempotencyKey(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `game-change-password-${crypto.randomUUID()}`;
    }
    return `game-change-password-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  }
}
