export const PASSWORD_POLICY = {
  minLength: 8,
  maxLength: 100,
} as const;

export type PasswordEvaluation = {
  hasUppercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  hasMinLength: boolean;
  score: number;
  strengthPercent: number;
  isCompliant: boolean;
};

const UPPERCASE_REGEX = /[A-Z]/;
const NUMBER_REGEX = /[0-9]/;
const SPECIAL_REGEX = /[^A-Za-z0-9]/;

export function evaluatePassword(password: string): PasswordEvaluation {
  const hasUppercase = UPPERCASE_REGEX.test(password);
  const hasNumber = NUMBER_REGEX.test(password);
  const hasSpecial = SPECIAL_REGEX.test(password);
  const hasMinLength = password.length >= PASSWORD_POLICY.minLength;
  const score = [hasUppercase, hasNumber, hasSpecial, hasMinLength].filter(Boolean).length;

  return {
    hasUppercase,
    hasNumber,
    hasSpecial,
    hasMinLength,
    score,
    strengthPercent: score * 25,
    isCompliant: hasUppercase && hasNumber && hasSpecial && hasMinLength,
  };
}

export function isPasswordCompliant(password: string): boolean {
  return evaluatePassword(password).isCompliant;
}
