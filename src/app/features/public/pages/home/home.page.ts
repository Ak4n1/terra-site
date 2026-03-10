import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { AboutGameSectionComponent } from '../../components/home/about-game-section/about-game-section.component';
import { GameFeaturesSectionComponent } from '../../components/home/game-features-section/game-features-section.component';
import { HeroHomeComponent } from '../../components/home/hero-home/hero-home.component';
import type { SpotlightSlide } from '../../../../shared/ui/organisms/sliders/spotlight-carousel/spotlight-carousel.types';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [HeroHomeComponent, GameFeaturesSectionComponent, AboutGameSectionComponent],
  templateUrl: './home.page.html',
  styleUrl: './home.page.css'
})
export class HomePage implements AfterViewInit {
  @ViewChild('homeBackgroundVideo') private homeBackgroundVideo?: ElementRef<HTMLVideoElement>;

  readonly heroSlides: SpotlightSlide[] = [
    {
      imageSrc: 'assets/images/app/hero/baium.webp',
      thumbSrc: 'assets/images/app/hero/baium.webp',
      titleKey: 'raidBaiumTitle',
      descriptionKey: 'raidBaiumDescription'
    },
    {
      imageSrc: 'assets/images/app/hero/antharas.webp',
      thumbSrc: 'assets/images/app/hero/antharas.webp',
      titleKey: 'raidAntharasTitle',
      descriptionKey: 'raidAntharasDescription'
    },
    {
      imageSrc: 'assets/images/app/hero/queenant.webp',
      thumbSrc: 'assets/images/app/hero/queenant.webp',
      titleKey: 'raidQueenAntTitle',
      descriptionKey: 'raidQueenAntDescription'
    },
    {
      imageSrc: 'assets/images/app/hero/zaken.webp',
      thumbSrc: 'assets/images/app/hero/zaken.webp',
      titleKey: 'raidZakenTitle',
      descriptionKey: 'raidZakenDescription'
    },
    {
      imageSrc: 'assets/images/app/hero/orfen.webp',
      thumbSrc: 'assets/images/app/hero/orfen.webp',
      titleKey: 'raidOrfenTitle',
      descriptionKey: 'raidOrfenDescription'
    },
    {
      imageSrc: 'assets/images/app/hero/core.webp',
      thumbSrc: 'assets/images/app/hero/core.webp',
      titleKey: 'raidCoreTitle',
      descriptionKey: 'raidCoreDescription'
    }
  ];

  ngAfterViewInit(): void {
    this.ensureVideoPlayback();
  }

  ensureVideoPlayback(): void {
    const video = this.homeBackgroundVideo?.nativeElement;
    if (!video) {
      return;
    }

    // Forzar reproducción en navegadores que no arrancan autoplay al primer render.
    video.muted = true;
    video.playsInline = true;
    void video.play().catch(() => {
      // Fallback: se mantiene el poster sin romper la UI.
    });
  }
}
