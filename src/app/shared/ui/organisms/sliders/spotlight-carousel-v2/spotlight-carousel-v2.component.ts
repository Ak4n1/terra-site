import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
  PLATFORM_ID,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import { LanguageService } from '../../../../../core/i18n/language.service';
import type { SpotlightSlide } from '../spotlight-carousel/spotlight-carousel.types';

type JQueryWithSlick = {
  on(event: string, handler: (...args: unknown[]) => void): JQueryWithSlick;
  off(event?: string): JQueryWithSlick;
  hasClass(className: string): boolean;
  slick(commandOrOptions?: unknown, ...args: unknown[]): JQueryWithSlick;
};

@Component({
  selector: 'ui-spotlight-carousel-v2',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './spotlight-carousel-v2.component.html',
  styleUrl: './spotlight-carousel-v2.component.css',
})
export class SpotlightCarouselV2Component implements AfterViewInit, OnChanges, OnDestroy {
  readonly languageService = inject(LanguageService);
  private readonly ngZone = inject(NgZone);
  private readonly platformId = inject(PLATFORM_ID);

  @Input() slides: SpotlightSlide[] = [];
  @Output() activeImageChange = new EventEmitter<string>();
  @ViewChild('sliderHost') private sliderHostRef?: ElementRef<HTMLElement>;

  private $slider: JQueryWithSlick | null = null;
  private slickReady = false;
  private destroyed = false;
  private reinitTimer: ReturnType<typeof setTimeout> | null = null;

  get resolvedSlides(): SpotlightSlide[] {
    return this.slides.length ? this.slides : [];
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.emitSlideImage(0);
    void this.initSlider();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!isPlatformBrowser(this.platformId) || !changes['slides'] || changes['slides'].firstChange) {
      return;
    }

    this.emitSlideImage(0);
    this.scheduleReinit();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    if (this.reinitTimer) {
      clearTimeout(this.reinitTimer);
      this.reinitTimer = null;
    }
    this.destroySlider();
  }

  private async initSlider(): Promise<void> {
    if (this.destroyed || !this.sliderHostRef?.nativeElement || !this.resolvedSlides.length) {
      return;
    }

    const jqueryModule = await import('jquery');
    const $ = jqueryModule.default as unknown as (target: HTMLElement) => JQueryWithSlick;
    (window as typeof window & { $?: typeof $; jQuery?: typeof $ }).$ = $;
    (window as typeof window & { $?: typeof $; jQuery?: typeof $ }).jQuery = $;
    await import('slick-carousel/slick/slick.js');

    if (this.destroyed || !this.sliderHostRef?.nativeElement) {
      return;
    }

    this.destroySlider();

    const $slider = $(this.sliderHostRef.nativeElement) as JQueryWithSlick;
    this.$slider = $slider;

    $slider.on('init', (...args: unknown[]) => {
      const slick = args[1] as { currentSlide?: number } | undefined;
      this.ngZone.run(() => this.emitSlideImage(slick?.currentSlide ?? 0));
    });

    $slider.on('afterChange', (...args: unknown[]) => {
      const slick = args[1] as { currentSlide?: number } | undefined;
      const currentSlide = typeof args[2] === 'number' ? args[2] : slick?.currentSlide ?? 0;
      this.ngZone.run(() => this.emitSlideImage(currentSlide));
    });

    $slider.on('destroy', () => {
      this.slickReady = false;
    });

    $slider.slick({
      arrows: false,
      dots: false,
      infinite: true,
      speed: 560,
      cssEase: 'ease',
      slidesToShow: 3,
      slidesToScroll: 1,
      centerMode: true,
      centerPadding: '0px',
      swipeToSlide: true,
      touchThreshold: 10,
      draggable: true,
      focusOnSelect: true,
      variableWidth: false,
      adaptiveHeight: false,
      accessibility: false,
      mobileFirst: false,
      responsive: [
        {
          breakpoint: 1024,
          settings: {
            slidesToShow: 3,
            centerPadding: '0px',
          },
        },
        {
          breakpoint: 640,
          settings: {
            slidesToShow: 1,
            centerPadding: '28px',
          },
        },
      ],
    });

    this.slickReady = true;
  }

  private scheduleReinit(): void {
    if (this.reinitTimer) {
      clearTimeout(this.reinitTimer);
    }

    this.reinitTimer = setTimeout(() => {
      this.reinitTimer = null;
      void this.initSlider();
    }, 0);
  }

  private destroySlider(): void {
    if (!this.$slider) {
      return;
    }

    this.$slider.off('init');
    this.$slider.off('afterChange');
    this.$slider.off('destroy');

    if (this.slickReady && this.$slider.hasClass('slick-initialized')) {
      this.$slider.slick('unslick');
    }

    this.$slider = null;
    this.slickReady = false;
  }

  private emitSlideImage(index: number): void {
    const slideCount = this.resolvedSlides.length;
    if (!slideCount) {
      return;
    }

    const safeIndex = ((index % slideCount) + slideCount) % slideCount;
    const slide = this.resolvedSlides[safeIndex];
    if (slide) {
      this.activeImageChange.emit(slide.imageSrc);
    }
  }
}
