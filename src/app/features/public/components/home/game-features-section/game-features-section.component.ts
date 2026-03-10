import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Boxes, CalendarDays, Flame, LucideAngularModule, type LucideIconData } from 'lucide-angular';
import { LanguageService } from '../../../../../core/i18n/language.service';

type GameFeature = {
  icon: LucideIconData;
  titleKey: string;
  descriptionKey: string;
};

@Component({
  selector: 'app-game-features-section',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './game-features-section.component.html',
  styleUrl: './game-features-section.component.css'
})
export class GameFeaturesSectionComponent {
  readonly languageService = inject(LanguageService);

  readonly features: GameFeature[] = [
    {
      icon: CalendarDays,
      titleKey: 'featureEventsTitle',
      descriptionKey: 'featureEventsDescription'
    },
    {
      icon: Flame,
      titleKey: 'featureTimedHuntingTitle',
      descriptionKey: 'featureTimedHuntingDescription'
    },
    {
      icon: Boxes,
      titleKey: 'featureInstancesTitle',
      descriptionKey: 'featureInstancesDescription'
    }
  ];
}
