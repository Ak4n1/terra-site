import { Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { LanguageService } from '../../../../../core/i18n/language.service';
import { SpotlightCarouselComponent } from '../../../../../shared/ui/organisms/sliders/spotlight-carousel/spotlight-carousel.component';
import type { SpotlightSlide } from '../../../../../shared/ui/organisms/sliders/spotlight-carousel/spotlight-carousel.types';

@Component({
  selector: 'app-hero-home',
  standalone: true,
  imports: [SpotlightCarouselComponent],
  templateUrl: './hero-home.component.html',
  styleUrl: './hero-home.component.css'
})
export class HeroHomeComponent implements OnChanges {
  readonly languageService = inject(LanguageService);
  @Input() slides: SpotlightSlide[] = [];
  @Input() headerImageSrc = '';
  @Input() syncHeaderWithActiveSlide = true;

  ngOnChanges(changes: SimpleChanges): void {
    if (this.syncHeaderWithActiveSlide && changes['slides'] && this.slides.length && !this.headerImageSrc) {
      this.headerImageSrc = this.slides[0].imageSrc;
    }
  }

  onActiveImageChange(imageSrc: string): void {
    if (!this.syncHeaderWithActiveSlide) {
      return;
    }
    this.headerImageSrc = imageSrc;
  }

}
