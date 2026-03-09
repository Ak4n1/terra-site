import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, EventEmitter, Input, NgZone, OnDestroy, Output, inject } from '@angular/core';
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

  readonly sliderId = `rev_slider_50_1_${++sliderInstanceCounter}`;
  readonly wrapperId = `${this.sliderId}_wrapper`;

  private readonly ngZone = inject(NgZone);
  private revApi: any;
  private readonly handleViewportChange = (): void => {
    if (this.revApi && typeof this.revApi.revredraw === 'function') {
      this.revApi.revredraw();
    }
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

    const tpj = window.jQuery;
    if (!tpj) {
      return;
    }

    tpj(() => {
      const sliderElement = tpj(`#${this.sliderId}`);

      if (!sliderElement.length) {
        return;
      }

      if (sliderElement.revolution === undefined) {
        window.revslider_showDoubleJqueryError?.(`#${this.sliderId}`);
        return;
      }

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
          space: -90,
          stretch: 'off'
        },
        responsiveLevels: [1240, 1024, 778, 480],
        gridwidth: [800, 600, 400, 320],
        gridheight: [600, 400, 320, 280],
        lazyType: 'none',
        shadow: 0,
        spinner: 'off',
        stopLoop: 'on',
        stopAfterLoops: 0,
        stopAtSlide: 1,
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

      setTimeout(() => {
        if (this.revApi && typeof this.revApi.revredraw === 'function') {
          this.revApi.revredraw();
        }
      }, 0);
    });
    window.addEventListener('resize', this.handleViewportChange);
    window.addEventListener('orientationchange', this.handleViewportChange);
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.handleViewportChange);
    window.removeEventListener('orientationchange', this.handleViewportChange);
    if (this.revApi && typeof this.revApi.revkill === 'function') {
      this.revApi.revkill();
      this.revApi = null;
    }
  }
}
