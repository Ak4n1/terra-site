import { Component, inject } from '@angular/core';
import { LanguageService } from '../../../../core/i18n/language.service';
import { ButtonComponent } from '../../atoms/button/button.component';

type VoteSite = 'hopzone' | 'l2jbrasil';

@Component({
  selector: 'ui-server-vote-section',
  standalone: true,
  imports: [ButtonComponent],
  templateUrl: './server-vote-section.component.html',
  styleUrl: './server-vote-section.component.css'
})
export class ServerVoteSectionComponent {
  private readonly languageService = inject(LanguageService);

  private readonly voteLinks: Record<VoteSite, string> = {
    hopzone: 'https://l2.hopzone.net/es/site/vote/106793/1',
    l2jbrasil: 'https://top.l2jbrasil.com/index.php?a=stats&u=ak4n1'
  };

  t(key: string): string {
    return this.languageService.t(key);
  }

  openVote(site: VoteSite, event?: Event): void {
    event?.preventDefault();

    const link = this.voteLinks[site];
    if (!link) {
      return;
    }

    if (typeof window !== 'undefined') {
      window.open(link, '_blank', 'noopener,noreferrer');
    }
  }
}
