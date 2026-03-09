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
    { imageSrc: 'assets/images/hero-carousel/hero1.webp', thumbSrc: 'assets/images/hero-carousel/hero1.webp' },
    { imageSrc: 'assets/images/hero-carousel/hero2.webp', thumbSrc: 'assets/images/hero-carousel/hero2.webp' },
    { imageSrc: 'assets/images/hero-carousel/hero3.webp', thumbSrc: 'assets/images/hero-carousel/hero3.webp' },
    { imageSrc: 'assets/images/hero-carousel/hero5.webp', thumbSrc: 'assets/images/hero-carousel/hero5.webp' }
  ];
}
