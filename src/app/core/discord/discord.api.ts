import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type {
  DiscordCommunityMember,
  DiscordCommunitySnapshot,
  DiscordWidgetMember,
  DiscordWidgetResponse
} from './discord.models';

@Injectable({ providedIn: 'root' })
export class DiscordApi {
  private static readonly DEFAULT_INVITE_URL = 'https://discord.gg/wXnPMdStvW';
  private static readonly DEFAULT_AVATAR_URL = 'https://cdn.discordapp.com/embed/avatars/0.png';

  private readonly http = inject(HttpClient);

  loadWidgetSnapshot(): Observable<DiscordCommunitySnapshot> {
    const guildId = environment.discordGuildId?.trim();

    if (!guildId) {
      throw new Error('Missing environment.discordGuildId');
    }

    const endpoint = `https://discord.com/api/guilds/${guildId}/widget.json`;

    return this.http.get<DiscordWidgetResponse>(endpoint).pipe(
      map(payload => {
        const members = (payload.members ?? []).map(member => this.mapMember(member));

        return {
          serverName: payload.name?.trim() || 'Terra Discord',
          onlineCount: Number.isFinite(payload.presence_count) ? Math.max(0, payload.presence_count ?? 0) : members.length,
          inviteUrl: this.resolveInvite(payload.instant_invite),
          visibleMembers: members.slice(0, 12)
        };
      })
    );
  }

  private mapMember(member: DiscordWidgetMember): DiscordCommunityMember {
    const status = this.normalizeStatus(member.status);

    return {
      id: member.id?.trim() || `${member.username ?? 'member'}-${Math.random().toString(36).slice(2, 10)}`,
      username: member.username?.trim() || 'User',
      avatarUrl: member.avatar_url?.trim() || DiscordApi.DEFAULT_AVATAR_URL,
      status,
      activityName: member.game?.name?.trim() || null
    };
  }

  private resolveInvite(instantInvite: string | null | undefined): string {
    const fallbackInvite = environment.discordInviteUrl?.trim();

    if (instantInvite?.trim()) {
      return instantInvite;
    }

    if (fallbackInvite) {
      return fallbackInvite;
    }

    return DiscordApi.DEFAULT_INVITE_URL;
  }

  private normalizeStatus(rawStatus: string | undefined): DiscordCommunityMember['status'] {
    if (rawStatus === 'online' || rawStatus === 'idle' || rawStatus === 'dnd') {
      return rawStatus;
    }

    return 'offline';
  }
}
