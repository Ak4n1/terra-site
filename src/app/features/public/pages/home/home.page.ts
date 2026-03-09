import { Component } from '@angular/core';
import { HeroHomeComponent } from '../../components/home/hero-home/hero-home.component';
import type { SpotlightSlide } from '../../../../shared/ui/organisms/sliders/spotlight-carousel/spotlight-carousel.types';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [HeroHomeComponent],
  templateUrl: './home.page.html',
  styleUrl: './home.page.css'
})
export class HomePage {
  readonly heroSlides: SpotlightSlide[] = [
    {
      imageSrc: 'assets/images/app/hero/baium3.png',
      thumbSrc: 'assets/images/app/hero/baium3.png',
      titleKey: 'raidBaiumTitle',
      descriptionKey: 'raidBaiumDescription'
    },
    {
      imageSrc: 'assets/images/app/hero/antharas2.png',
      thumbSrc: 'assets/images/app/hero/antharas2.png',
      titleKey: 'raidAntharasTitle',
      descriptionKey: 'raidAntharasDescription'
    },
    {
      imageSrc: 'assets/images/app/hero/queenant3.png',
      thumbSrc: 'assets/images/app/hero/queenant3.png',
      titleKey: 'raidQueenAntTitle',
      descriptionKey: 'raidQueenAntDescription'
    },
    {
      imageSrc: 'assets/images/app/hero/zaken2.png',
      thumbSrc: 'assets/images/app/hero/zaken2.png',
      titleKey: 'raidZakenTitle',
      descriptionKey: 'raidZakenDescription'
    },
    {
      imageSrc: 'assets/images/app/hero/orfen1.png',
      thumbSrc: 'assets/images/app/hero/orfen1.png',
      titleKey: 'raidOrfenTitle',
      descriptionKey: 'raidOrfenDescription'
    }
  ];
}
