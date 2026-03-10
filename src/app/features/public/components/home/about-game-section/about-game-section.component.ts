import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { LanguageService } from '../../../../../core/i18n/language.service';
import { GameStatCardComponent } from '../../../../../shared/ui/atoms/game-stat-card/game-stat-card.component';

type GameStat = {
  value: number;
  labelKey: string;
};

@Component({
  selector: 'app-about-game-section',
  standalone: true,
  imports: [CommonModule, GameStatCardComponent],
  templateUrl: './about-game-section.component.html',
  styleUrl: './about-game-section.component.css'
})
export class AboutGameSectionComponent {
  readonly languageService = inject(LanguageService);

  readonly stats: GameStat[] = [
    { value: 6, labelKey: 'aboutStatGrandBosses' },
    { value: 154, labelKey: 'aboutStatRaidBosses' },
    { value: 5, labelKey: 'aboutStatCastles' }
  ];
}
