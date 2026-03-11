import type { AlertVariant } from '../../shared/ui/atoms/alert/alert.component';
import {
  AUTH_RESPONSE_CODES,
  SECURITY_RESPONSE_CODES,
  VALIDATION_RESPONSE_CODES
} from './api-response-codes';

const ALERT_VARIANT_BY_CODE: Record<string, AlertVariant> = {
  [AUTH_RESPONSE_CODES.LOGIN_SUCCESS]: 'success',
  [AUTH_RESPONSE_CODES.LOGOUT_SUCCESS]: 'success',
  [AUTH_RESPONSE_CODES.LOGOUT_ALL_SUCCESS]: 'success',
  [AUTH_RESPONSE_CODES.PASSWORD_RESET_SUCCESS]: 'success',
  [AUTH_RESPONSE_CODES.VERIFICATION_EMAIL_SENT]: 'success',
  [AUTH_RESPONSE_CODES.EMAIL_VERIFIED]: 'success',
  [AUTH_RESPONSE_CODES.VERIFICATION_EMAIL_RESENT_IF_POSSIBLE]: 'success',
  [AUTH_RESPONSE_CODES.PASSWORD_RESET_EMAIL_SENT_IF_POSSIBLE]: 'success',
  [AUTH_RESPONSE_CODES.TOKEN_REFRESHED]: 'success',

  [AUTH_RESPONSE_CODES.EMAIL_NOT_VERIFIED]: 'warning',
  [VALIDATION_RESPONSE_CODES.FAILED]: 'warning',
  [SECURITY_RESPONSE_CODES.RATE_LIMIT_EXCEEDED]: 'warning'
};

export function resolveAlertVariant(code: string | null | undefined, status: number): AlertVariant {
  if (code && ALERT_VARIANT_BY_CODE[code]) {
    return ALERT_VARIANT_BY_CODE[code];
  }

  if (status >= 400) {
    return 'error';
  }

  return 'warning';
}
