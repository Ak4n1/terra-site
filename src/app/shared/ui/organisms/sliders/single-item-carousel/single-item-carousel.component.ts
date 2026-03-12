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
import { ButtonComponent } from '../../../atoms/button/button.component';

type JQueryWithSlick = {
  on(event: string, handler: (...args: unknown[]) => void): JQueryWithSlick;
  off(event?: string): JQueryWithSlick;
  hasClass(className: string): boolean;
  slick(commandOrOptions?: unknown, ...args: unknown[]): JQueryWithSlick;
};

export type SingleItemCarouselSlide = {
  titleKey: string;
  descriptionKey: string;
  ctaLabelKey: string;
  ctaActionId: string;
  eyebrowKey?: string;
  imageSrc?: string;
};

@Component({
  selector: 'ui-single-item-carousel',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  templateUrl: './single-item-carousel.component.html',
  styleUrl: './single-item-carousel.component.css',
})
export class SingleItemCarouselComponent implements AfterViewInit, OnChanges, OnDestroy {
  readonly languageService = inject(LanguageService);
  private readonly ngZone = inject(NgZone);
  private readonly platformId = inject(PLATFORM_ID);

  @Input() slides: SingleItemCarouselSlide[] = [];
  @Input() autoplaySpeed = 5400;
  @Input() buttonVariant: 'main-1' | 'white' = 'main-1';
  @Output() readonly actionClick = new EventEmitter<string>();
  @ViewChild('sliderHost') private sliderHostRef?: ElementRef<HTMLElement>;

  private $slider: JQueryWithSlick | null = null;
  private slickReady = false;
  private destroyed = false;
  private reinitTimer: ReturnType<typeof setTimeout> | null = null;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    void this.initSlider();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!isPlatformBrowser(this.platformId) || (!changes['slides'] && !changes['autoplaySpeed'])) {
      return;
    }

    this.scheduleReinit(32);
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    if (this.reinitTimer) {
      clearTimeout(this.reinitTimer);
      this.reinitTimer = null;
    }
    this.destroySlider();
  }

  onActionClick(actionId: string): void {
    this.actionClick.emit(actionId);
  }

  getSlideStyle(slide: SingleItemCarouselSlide): Record<string, string> {
    if (!slide.imageSrc) {
      return {};
    }

    return {
      'background-image': `linear-gradient(90deg, rgba(8, 8, 8, 0.86) 0%, rgba(8, 8, 8, 0.72) 40%, rgba(8, 8, 8, 0.5) 100%), url('${slide.imageSrc}')`
    };
  }

  private async initSlider(): Promise<void> {
    if (this.destroyed || !this.sliderHostRef?.nativeElement) {
      return;
    }

    if (this.slides.length <= 1) {
      this.destroySlider();
      return;
    }

    const initialSlideCount = this.sliderHostRef.nativeElement.querySelectorAll('.single-item-carousel__slide').length;
    if (initialSlideCount === 0) {
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

    const renderedSlideCount = this.sliderHostRef.nativeElement.querySelectorAll('.single-item-carousel__slide').length;
    if (renderedSlideCount === 0) {
      return;
    }

    this.destroySlider();

    const $slider = $(this.sliderHostRef.nativeElement) as JQueryWithSlick;
    this.$slider = $slider;

    $slider.on('destroy', () => {
      this.ngZone.run(() => {
        this.slickReady = false;
      });
    });

    $slider.slick({
      arrows: false,
      dots: false,
      infinite: this.slides.length > 1,
      initialSlide: 0,
      slidesToShow: 1,
      slidesToScroll: 1,
      speed: 500,
      cssEase: 'ease',
      autoplay: this.slides.length > 1,
      autoplaySpeed: this.autoplaySpeed,
      pauseOnHover: true,
      pauseOnFocus: true,
      draggable: this.slides.length > 1,
      swipe: this.slides.length > 1,
      adaptiveHeight: false,
      accessibility: false,
    });

    // Force a stable viewport position after re-init (language switch can leave track offset).
    $slider.slick('slickGoTo', 0, true);
    $slider.slick('setPosition');
    setTimeout(() => {
      if (!this.destroyed && this.$slider && this.slickReady && this.$slider.hasClass('slick-initialized')) {
        this.$slider.slick('slickGoTo', 0, true);
        this.$slider.slick('setPosition');
      }
    }, 0);

    this.slickReady = true;
  }

  private scheduleReinit(delayMs = 0): void {
    if (this.reinitTimer) {
      clearTimeout(this.reinitTimer);
    }

    this.reinitTimer = setTimeout(() => {
      this.reinitTimer = null;
      if (!this.destroyed) {
        void this.initSlider();
      }
    }, delayMs);
  }

  private destroySlider(): void {
    if (!this.$slider) {
      return;
    }

    this.$slider.off('destroy');

    if (this.slickReady && this.$slider.hasClass('slick-initialized')) {
      this.$slider.slick('unslick');
    }

    this.$slider = null;
    this.slickReady = false;
  }
}
