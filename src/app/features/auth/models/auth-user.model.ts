export type AuthUser = {
  id: number;
  email: string;
  username?: string | null;
  avatarType?: 'DEFAULT' | 'PRESET' | 'CUSTOM' | null;
  avatarPresetPath?: string | null;
  avatarCustomUrl?: string | null;
  enabled: boolean;
  emailVerified: boolean;
  preferredLanguage: 'us' | 'es' | 'pt' | 'fr' | 'de';
  roles: string[];
  createdAt: string;
};
