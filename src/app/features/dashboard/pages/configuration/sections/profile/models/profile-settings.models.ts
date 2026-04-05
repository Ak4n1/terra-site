export type AvatarGroup = {
  key: string;
  label: string;
  avatars: string[];
};

export type AvatarCategory = {
  key: string;
  label: string;
  count: number;
};

export type AvatarDraft = {
  kind: 'preset' | 'custom' | 'default';
  value: string | null;
};
