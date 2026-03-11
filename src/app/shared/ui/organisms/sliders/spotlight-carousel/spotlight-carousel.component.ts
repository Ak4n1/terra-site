import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, EventEmitter, Input, NgZone, OnDestroy, Output, ViewChild, inject } from '@angular/core';
import { LanguageService } from '../../../../../core/i18n/language.service';
import type { SpotlightSlide } from './spotlight-carousel.types';

declare global {
  interface Window {
    jQuery?: any;
    revslider_showDoubleJqueryError?: (selector: string) => void;
  }
}

let sliderInstanceCounter = 0;

@Component({
  selector: 'ui-spotlight-carousel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './spotlight-carousel.component.html',
  styleUrl: './spotlight-carousel.component.css'
})
export class SpotlightCarouselComponent implements AfterViewInit, OnDestroy {
  readonly languageService = inject(LanguageService);
  @Input() slides: SpotlightSlide[] = [];
  @Output() activeImageChange = new EventEmitter<string>();
  @ViewChild('wrapperElement') private wrapperElementRef?: ElementRef<HTMLElement>;
  @ViewChild('sliderElement') private sliderElementRef?: ElementRef<HTMLElement>;

  readonly sliderId = `rev_slider_${this.createSliderInstanceId()}_${++sliderInstanceCounter}`;
  readonly wrapperId = `${this.sliderId}_wrapper`;

  private readonly ngZone = inject(NgZone);
  private revApi: any;
  private initialized = false;
  private initAttempts = 0;
  private initFrameId: number | null = null;
  private redrawFrameId: number | null = null;
  private readonly handleViewportChange = (): void => {
    if (!this.revApi || typeof this.revApi.revredraw !== 'function' || this.redrawFrameId !== null) {
      return;
    }

    this.redrawFrameId = window.requestAnimationFrame(() => {
      this.redrawFrameId = null;

      const sliderElement = this.sliderElementRef?.nativeElement;
      if (!sliderElement || !sliderElement.isConnected || sliderElement.clientWidth === 0 || sliderElement.clientHeight === 0) {
        return;
      }

      this.revApi.revredraw();
    });
  };

  get resolvedSlides(): SpotlightSlide[] {
    return this.slides.length ? this.slides : [];
  }

  getTransition(index: number): string {
    return index % 2 === 0 ? 'slideoverhorizontal' : 'slideoververtical';
  }

  ngAfterViewInit(): void {
    if (this.resolvedSlides.length) {
      const initialSlide = this.resolvedSlides[0];
      this.activeImageChange.emit(initialSlide.imageSrc);
    }

    this.scheduleInitialization();
    window.addEventListener('resize', this.handleViewportChange);
    window.addEventListener('orientationchange', this.handleViewportChange);
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.handleViewportChange);
    window.removeEventListener('orientationchange', this.handleViewportChange);
    if (this.initFrameId !== null) {
      window.cancelAnimationFrame(this.initFrameId);
      this.initFrameId = null;
    }
    if (this.redrawFrameId !== null) {
      window.cancelAnimationFrame(this.redrawFrameId);
      this.redrawFrameId = null;
    }
    if (this.revApi && typeof this.revApi.revkill === 'function') {
      this.revApi.revkill();
      this.revApi = null;
    }
    this.initialized = false;
  }

  private scheduleInitialization(): void {
    if (this.initialized || this.initFrameId !== null) {
      return;
    }

    this.initFrameId = window.requestAnimationFrame(() => {
      this.initFrameId = null;
      this.tryInitializeSlider();
    });
  }

  private tryInitializeSlider(): void {
    if (this.initialized) {
      return;
    }

    const wrapperElement = this.wrapperElementRef?.nativeElement;
    const nativeSliderElement = this.sliderElementRef?.nativeElement;
    if (!wrapperElement || !nativeSliderElement) {
      return;
    }

    if (document.hidden) {
      if (this.initAttempts < 20) {
        this.initAttempts += 1;
        this.scheduleInitialization();
      }
      return;
    }

    const wrapperRect = wrapperElement.getBoundingClientRect();
    if (wrapperRect.width === 0 || !this.areSlideImagesReady(nativeSliderElement)) {
      if (this.initAttempts < 20) {
        this.initAttempts += 1;
        this.scheduleInitialization();
      }
      return;
    }

    const tpj = window.jQuery;
    if (!tpj) {
      return;
    }

    const sliderElement = tpj(`#${this.sliderId}`);
    if (!sliderElement.length) {
      return;
    }

    if (sliderElement.revolution === undefined) {
      window.revslider_showDoubleJqueryError?.(`#${this.sliderId}`);
      return;
    }

    this.initialized = true;
    this.revApi = sliderElement.show().revolution({
      sliderType: 'carousel',
      jsFileLocation: 'assets/vendor/revolution/js/',
      sliderLayout: 'auto',
      dottedOverlay: 'none',
      delay: 9000,
      navigation: {
        keyboardNavigation: 'off',
        keyboard_direction: 'horizontal',
        onHoverStop: 'off'
      },
      carousel: {
        maxRotation: 8,
        vary_rotation: 'off',
        minScale: 20,
        vary_scale: 'off',
        horizontal_align: 'center',
        vertical_align: 'center',
        fadeout: 'off',
        vary_fade: 'off',
        maxVisibleItems: 3,
        infinity: 'on',
        space: -150,
        stretch: 'off'
      },
      responsiveLevels: [1240, 1024, 778, 480],
      gridwidth: [800, 600, 400, 320],
      gridheight: [600, 400, 320, 280],
      lazyType: 'none',
      shadow: 0,
      spinner: 'off',
      stopLoop: 'off',
      stopAfterLoops: 0,
      stopAtSlide: -1,
      shuffle: 'off',
      autoHeight: 'off',
      fullScreenAlignForce: 'off',
      fullScreenOffsetContainer: '',
      fullScreenOffset: '',
      disableProgressBar: 'on',
      hideThumbsOnMobile: 'off',
      hideSliderAtLimit: 0,
      hideCaptionAtLimit: 0,
      hideAllCaptionAtLilmit: 0,
      debugMode: false,
      fallbacks: {
        simplifyAll: 'off',
        nextSlideOnWindowFocus: 'off',
        disableFocusListener: false
      }
    });

    this.revApi.on('revolution.slide.onbeforeswap', (_event: unknown, data: any) => {
      const nextSrc = data?.nextslide?.find('img.rev-slidebg')?.attr('src');
      if (!nextSrc) {
        return;
      }

      this.ngZone.run(() => {
        this.activeImageChange.emit(nextSrc);
      });
    });

    this.handleViewportChange();
  }

  private areSlideImagesReady(sliderElement: HTMLElement): boolean {
    const slideImages = Array.from(sliderElement.querySelectorAll<HTMLImageElement>('img.rev-slidebg'));
    return slideImages.length > 0 && slideImages.every((image) => image.complete && image.naturalWidth > 0);
  }

  private createSliderInstanceId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID().replace(/-/g, '');
    }

    return `${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
  }
}
