import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { DiscordApi } from '../../../../core/discord/discord.api';
import type { DiscordCommunityMember, DiscordCommunitySnapshot } from '../../../../core/discord/discord.models';
import { LanguageService } from '../../../../core/i18n/language.service';
import { AlertComponent } from '../../atoms/alert/alert.component';
import { ButtonComponent } from '../../atoms/button/button.component';
import { MaskButtonComponent } from '../../atoms/mask-button/mask-button.component';
import { InputFieldComponent } from '../../molecules/input-field/input-field.component';

@Component({
  selector: 'ui-discord-widget',
  standalone: true,
  imports: [CommonModule, ButtonComponent, MaskButtonComponent, AlertComponent, InputFieldComponent],
  templateUrl: './discord-widget.component.html',
  styleUrl: './discord-widget.component.css'
})
export class DiscordWidgetComponent implements OnInit {
  @Input() mockMembersCount = 0;

  private readonly languageService = inject(LanguageService);
  private readonly discordApi = inject(DiscordApi);

  readonly discordLoading = signal(true);
  readonly discordError = signal<string | null>(null);
  readonly discordSnapshot = signal<DiscordCommunitySnapshot | null>(null);
  readonly discordMembers = signal<DiscordCommunityMember[]>([]);
  readonly discordSearch = signal('');

  readonly filteredDiscordMembers = computed(() => {
    const search = this.discordSearch().trim().toLowerCase();
    const members = this.discordMembers();

    if (!search) {
      return members;
    }

    return members.filter(member => member.username.toLowerCase().includes(search));
  });

  ngOnInit(): void {
    void this.loadDiscordWidget();
  }

  t(key: string, params?: Record<string, string | number>): string {
    return this.languageService.t(key, params);
  }

  async loadDiscordWidget(): Promise<void> {
    this.discordLoading.set(true);
    this.discordError.set(null);

    try {
      const snapshot = await firstValueFrom(this.discordApi.loadWidgetSnapshot());
      const mergedMembers = [
        ...snapshot.visibleMembers,
        ...this.buildMockMembers(this.mockMembersCount)
      ];

      this.discordSnapshot.set(snapshot);
      this.discordMembers.set(mergedMembers);
    } catch {
      this.discordSnapshot.set(null);
      this.discordMembers.set([]);
      this.discordError.set(this.t('dashboardHomeDiscordError'));
    } finally {
      this.discordLoading.set(false);
    }
  }

  openDiscordInvite(): void {
    const snapshot = this.discordSnapshot();
    const targetUrl = snapshot?.inviteUrl?.trim() || environment.discordInviteUrl;

    if (!targetUrl?.trim()) {
      return;
    }

    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  }

  discordStatusKey(member: DiscordCommunityMember): string {
    if (member.status === 'online') {
      return 'dashboardHomeDiscordStatusOnline';
    }

    if (member.status === 'idle') {
      return 'dashboardHomeDiscordStatusIdle';
    }

    if (member.status === 'dnd') {
      return 'dashboardHomeDiscordStatusDnd';
    }

    return 'dashboardHomeDiscordStatusOffline';
  }

  discordActivityText(member: DiscordCommunityMember): string | null {
    if (!member.activityName) {
      return null;
    }

    return this.t('dashboardHomeDiscordMemberPlaying', { game: member.activityName });
  }

  updateDiscordSearch(value: string): void {
    this.discordSearch.set(value);
  }

  private buildMockMembers(count: number): DiscordCommunityMember[] {
    if (!count || count < 1) {
      return [];
    }

    const statuses: DiscordCommunityMember['status'][] = ['online', 'idle', 'dnd', 'offline'];

    return Array.from({ length: count }, (_, index) => {
      const position = index + 1;
      const status = statuses[index % statuses.length];
      const avatarIndex = index % 5;

      return {
        id: `mock-member-${position}`,
        username: `MockUser${String(position).padStart(2, '0')}`,
        avatarUrl: `https://cdn.discordapp.com/embed/avatars/${avatarIndex}.png`,
        status,
        activityName: index % 3 === 0 ? `Raid ${position}` : null
      };
    });
  }
}
