import type { AvatarCategory, AvatarGroup } from '../models/profile-settings.models';

export function buildAvatarGroups(avatars: readonly string[]): AvatarGroup[] {
  const groups = new Map<string, string[]>();
  for (const avatarPath of avatars) {
    const fileName = avatarPath.split('/').pop() ?? avatarPath;
    const match = /^FaceIcon_([^_]+)_/i.exec(fileName);
    const rawCategory = match?.[1] ?? 'other';
    const key = rawCategory.toLowerCase();
    const bucket = groups.get(key) ?? [];
    bucket.push(avatarPath);
    groups.set(key, bucket);
  }

  const toLabel = (rawKey: string) => rawKey.charAt(0).toUpperCase() + rawKey.slice(1);
  return Array.from(groups.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, groupedAvatars]) => ({
      key,
      label: toLabel(key),
      avatars: groupedAvatars
    }));
}

export function buildAvatarCategories(groups: readonly AvatarGroup[], totalCount: number): AvatarCategory[] {
  return [
    { key: 'all', label: 'Todos', count: totalCount },
    ...groups.map(group => ({
      key: group.key,
      label: group.label,
      count: group.avatars.length
    }))
  ];
}
