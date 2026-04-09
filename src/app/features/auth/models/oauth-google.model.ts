import type { AuthSession } from './auth-session.model';

export type OAuthGoogleStartResponse = {
  requiresEmailCode: boolean;
  challengeId: string | null;
  maskedEmail: string | null;
  session: AuthSession | null;
};

export type OAuthGoogleEmailCodeChallenge = {
  challengeId: string;
  maskedEmail: string;
};
