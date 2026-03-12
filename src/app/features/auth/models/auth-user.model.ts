export type AuthUser = {
  id: number;
  email: string;
  enabled: boolean;
  emailVerified: boolean;
  roles: string[];
  createdAt: string;
};
