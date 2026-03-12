import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
  inject
} from '@angular/core';
import { LanguageService } from '../../../../../core/i18n/language.service';
import type { SpotlightSlide } from '../../../../../shared/ui/organisms/sliders/spotlight-carousel/spotlight-carousel.types';
import { SpotlightCarouselV2Component } from '../../../../../shared/ui/organisms/sliders/spotlight-carousel-v2/spotlight-carousel-v2.component';

@Component({
  selector: 'app-hero-home',
  standalone: true,
  imports: [SpotlightCarouselV2Component],
  templateUrl: './hero-home.component.html',
  styleUrl: './hero-home.component.css'
})
export class HeroHomeComponent implements AfterViewInit, OnChanges, OnDestroy {
  readonly languageService = inject(LanguageService);
  private readonly ngZone = inject(NgZone);

  @Input() slides: SpotlightSlide[] = [];
  @Input() headerImageSrc = '';
  @Input() syncHeaderWithActiveSlide = true;
  @ViewChild('headerElement') private headerElement?: ElementRef<HTMLElement>;
  @ViewChild('headerBackgroundElement') private headerBackgroundElement?: ElementRef<HTMLElement>;
  @ViewChild('contentElement') private contentElement?: ElementRef<HTMLElement>;

  private animationFrameId: number | null = null;
  private readonly handleViewportChange = (): void => {
    if (this.animationFrameId !== null) {
      return;
    }

    this.animationFrameId = window.requestAnimationFrame(() => {
      this.animationFrameId = null;
      this.updateParallaxPosition();
    });
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (this.syncHeaderWithActiveSlide && changes['slides'] && this.slides.length && !this.headerImageSrc) {
      this.headerImageSrc = this.slides[0].imageSrc;
    }
  }

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      window.addEventListener('scroll', this.handleViewportChange, { passive: true });
      window.addEventListener('resize', this.handleViewportChange);
      window.addEventListener('orientationchange', this.handleViewportChange);
      this.handleViewportChange();
    });
  }

  ngOnDestroy(): void {
    window.removeEventListener('scroll', this.handleViewportChange);
    window.removeEventListener('resize', this.handleViewportChange);
    window.removeEventListener('orientationchange', this.handleViewportChange);

    if (this.animationFrameId !== null) {
      window.cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  onActiveImageChange(imageSrc: string): void {
    if (!this.syncHeaderWithActiveSlide) {
      return;
    }
    this.headerImageSrc = imageSrc;
  }

  private updateParallaxPosition(): void {
    const header = this.headerElement?.nativeElement;
    const background = this.headerBackgroundElement?.nativeElement;
    const content = this.contentElement?.nativeElement;

    if (!header || !background || !content) {
      return;
    }

    const rect = header.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

    if (rect.bottom <= 0 || rect.top >= viewportHeight) {
      background.style.transform = '';
      content.style.transform = '';
      return;
    }

    const visiblePercent = Math.max(0, Math.min(1, rect.bottom / (viewportHeight + rect.height)));
    const backgroundOffset = Math.min(240, 240 * (1 - visiblePercent));
    const contentOffset = Math.min(60, backgroundOffset * 0.28);

    background.style.transform = `translateY(${backgroundOffset}px) translateZ(0)`;
    content.style.transform = `translateY(${contentOffset}px) translateZ(0)`;
  }
}
