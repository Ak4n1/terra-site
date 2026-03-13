export type AuthUser = {
  id: number;
  email: string;
  enabled: boolean;
  emailVerified: boolean;
  preferredLanguage: 'us' | 'es' | 'pt' | 'fr' | 'de';
  roles: string[];
  createdAt: string;
};
