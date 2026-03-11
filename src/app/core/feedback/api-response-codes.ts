export const AUTH_RESPONSE_CODES = {
  LOGIN_SUCCESS: 'auth.login_success',
  LOGOUT_SUCCESS: 'auth.logout_success',
  LOGOUT_ALL_SUCCESS: 'auth.logout_all_success',
  PASSWORD_RESET_SUCCESS: 'auth.password_reset_success',
  VERIFICATION_EMAIL_SENT: 'auth.verification_email_sent',
  EMAIL_VERIFIED: 'auth.email_verified',
  VERIFICATION_EMAIL_RESENT_IF_POSSIBLE: 'auth.verification_email_resent_if_possible',
  PASSWORD_RESET_EMAIL_SENT_IF_POSSIBLE: 'auth.password_reset_email_sent_if_possible',
  TOKEN_REFRESHED: 'auth.token_refreshed',
  CURRENT_USER: 'auth.current_user',

  EMAIL_NOT_VERIFIED: 'auth.email_not_verified',
  INVALID_CREDENTIALS: 'auth.invalid_credentials',
  ACCOUNT_DISABLED: 'auth.account_disabled',
  INVALID_TOKEN: 'auth.invalid_token',
  INVALID_REFRESH_TOKEN: 'auth.invalid_refresh_token',
  INVALID_CSRF_TOKEN: 'auth.invalid_csrf_token',
  ACCESS_DENIED: 'auth.access_denied',
  UNAUTHORIZED: 'auth.unauthorized',
  EMAIL_ALREADY_REGISTERED: 'auth.email_already_registered',
  DEFAULT_USER_ROLE_NOT_FOUND: 'auth.default_user_role_not_found',
  USER_NOT_FOUND: 'auth.user_not_found',
  EMAIL_ALREADY_VERIFIED: 'auth.email_already_verified',
  INVALID_VERIFICATION_TOKEN: 'auth.invalid_verification_token',
  INVALID_PASSWORD_RESET_TOKEN: 'auth.invalid_password_reset_token'
} as const;

export const SECURITY_RESPONSE_CODES = {
  RATE_LIMIT_EXCEEDED: 'security.rate_limit_exceeded'
} as const;

export const VALIDATION_RESPONSE_CODES = {
  FAILED: 'validation.failed'
} as const;
