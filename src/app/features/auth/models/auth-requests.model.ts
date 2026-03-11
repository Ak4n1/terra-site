export type LoginRequest = {
  email: string;
  password: string;
};

export type RegisterRequest = {
  email: string;
  password: string;
};

export type ForgotPasswordRequest = {
  email: string;
};

export type ResetPasswordRequest = {
  token: string;
  newPassword: string;
};

export type VerifyEmailRequest = {
  token: string;
};

export type ResendVerificationRequest = {
  email: string;
};
