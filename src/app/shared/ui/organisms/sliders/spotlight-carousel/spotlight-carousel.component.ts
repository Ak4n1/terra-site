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
  private static assetsLoadPromise: Promise<void> | null = null;
  private static readonly desktopBreakpointQuery = '(min-width: 1025px)';

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
  private viewportQuery?: MediaQueryList;
  private readonly handleViewportModeChange = (event?: MediaQueryListEvent): void => {
    const matchesDesktop = event?.matches ?? this.isDesktopViewport();

    if (!matchesDesktop) {
      this.destroySlider();
      return;
    }

    if (!this.sliderElementRef?.nativeElement?.isConnected) {
      return;
    }

    this.initAttempts = 0;
    this.scheduleInitialization();
  };
  private readonly handleViewportChange = (): void => {
    if (!this.isDesktopViewport() || !this.revApi || typeof this.revApi.revredraw !== 'function' || this.redrawFrameId !== null) {
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

    this.viewportQuery = window.matchMedia(SpotlightCarouselComponent.desktopBreakpointQuery);
    this.viewportQuery.addEventListener('change', this.handleViewportModeChange);
    window.addEventListener('resize', this.handleViewportChange);
    window.addEventListener('orientationchange', this.handleViewportChange);

    void this.loadSliderAssets()
      .then(() => {
        if (!this.sliderElementRef?.nativeElement?.isConnected) {
          return;
        }

        this.handleViewportModeChange();
      })
      .catch((error) => {
        console.error('Failed to initialize spotlight carousel assets.', error);
      });
  }

  ngOnDestroy(): void {
    this.viewportQuery?.removeEventListener('change', this.handleViewportModeChange);
    window.removeEventListener('resize', this.handleViewportChange);
    window.removeEventListener('orientationchange', this.handleViewportChange);
    this.destroySlider();
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

  private loadSliderAssets(): Promise<void> {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return Promise.resolve();
    }

    if (window.jQuery?.fn?.revolution) {
      return Promise.resolve();
    }

    if (!SpotlightCarouselComponent.assetsLoadPromise) {
      SpotlightCarouselComponent.assetsLoadPromise = this.appendScriptsInOrder([
        'assets/vendor/jquery/jquery.min.js',
        'assets/vendor/revolution/js/jquery.themepunch.tools.min.js',
        'assets/vendor/revolution/js/jquery.themepunch.revolution.min.js',
        'assets/vendor/revolution/js/extensions/revolution.extension.video.min.js',
        'assets/vendor/revolution/js/extensions/revolution.extension.carousel.min.js',
        'assets/vendor/revolution/js/extensions/revolution.extension.navigation.min.js'
      ]).catch((error) => {
        SpotlightCarouselComponent.assetsLoadPromise = null;
        throw error;
      });
    }

    return SpotlightCarouselComponent.assetsLoadPromise;
  }

  private async appendScriptsInOrder(sources: string[]): Promise<void> {
    for (const source of sources) {
      await this.appendScript(source);
    }
  }

  private appendScript(source: string): Promise<void> {
    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${source}"]`);
    if (existingScript) {
      return existingScript.dataset['loaded'] === 'true'
        ? Promise.resolve()
        : new Promise((resolve, reject) => {
            existingScript.addEventListener('load', () => resolve(), { once: true });
            existingScript.addEventListener('error', () => reject(new Error(`Failed to load script: ${source}`)), { once: true });
          });
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = source;
      script.async = false;
      script.dataset['loaded'] = 'false';
      script.addEventListener(
        'load',
        () => {
          script.dataset['loaded'] = 'true';
          resolve();
        },
        { once: true }
      );
      script.addEventListener('error', () => reject(new Error(`Failed to load script: ${source}`)), { once: true });
      document.body.appendChild(script);
    });
  }

  private tryInitializeSlider(): void {
    if (this.initialized || !this.isDesktopViewport()) {
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

  private destroySlider(): void {
    if (this.initFrameId !== null) {
      window.cancelAnimationFrame(this.initFrameId);
      this.initFrameId = null;
    }

    if (this.redrawFrameId !== null) {
      window.cancelAnimationFrame(this.redrawFrameId);
      this.redrawFrameId = null;
    }

    if (this.revApi) {
      const sliderElement = this.sliderElementRef?.nativeElement;
      const tpj = window.jQuery;
      if (sliderElement && tpj) {
        const jqSlider = tpj(sliderElement);
        jqSlider.off();
        tpj(window).off(`resize.revslider-${sliderElement.id}`);
      }

      if (typeof this.revApi.revkill === 'function') {
        this.revApi.revkill();
      }
      this.revApi = null;
    }

    const nativeSliderElement = this.sliderElementRef?.nativeElement;
    if (nativeSliderElement) {
      nativeSliderElement.style.display = '';
    }

    this.initialized = false;
    this.initAttempts = 0;
  }

  private isDesktopViewport(): boolean {
    return this.viewportQuery?.matches ?? window.matchMedia(SpotlightCarouselComponent.desktopBreakpointQuery).matches;
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
