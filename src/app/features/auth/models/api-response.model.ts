export type ApiResponse<T> = {
  code: string;
  message: string;
  data: T | null;
  retryAfterSeconds?: number;
};

export type ApiValidationErrorResponse = {
  code: string;
  message: string;
  errors?: Record<string, string>;
};
