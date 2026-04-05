export interface DiscordWidgetGame {
  name?: string;
}

export interface DiscordWidgetMember {
  id?: string;
  username?: string;
  discriminator?: string;
  avatar?: string | null;
  avatar_url?: string;
  status?: string;
  game?: DiscordWidgetGame;
}

export interface DiscordWidgetResponse {
  id?: string;
  name?: string;
  instant_invite?: string | null;
  channels?: unknown[];
  members?: DiscordWidgetMember[];
  presence_count?: number;
}

export interface DiscordCommunityMember {
  id: string;
  username: string;
  avatarUrl: string;
  status: 'online' | 'idle' | 'dnd' | 'offline';
  activityName: string | null;
}

export interface DiscordCommunitySnapshot {
  serverName: string;
  onlineCount: number;
  inviteUrl: string;
  visibleMembers: DiscordCommunityMember[];
}
