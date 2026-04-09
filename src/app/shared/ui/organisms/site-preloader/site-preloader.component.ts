import { Component, HostBinding, Input, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { LanguageService } from '../../../../core/i18n/language.service';
import { OrbSpinnerComponent } from '../../atoms/orb-spinner/orb-spinner.component';

@Component({
  selector: 'ui-site-preloader',
  standalone: true,
  imports: [OrbSpinnerComponent],
  templateUrl: './site-preloader.component.html',
  styleUrl: './site-preloader.component.css'
})
export class SitePreloaderComponent implements OnInit, OnDestroy {
  private readonly languageService = inject(LanguageService);

  @Input() maskSrc = 'assets/images/app/preloader/mask-sprite-claws.svg';
  @Input() hideDelayMs = 1200;
  @Input() maxVisibleMs = 7000;
  @Input() animationDurationMs = 21500;
  @Input() fullScreen = true;
  @Input() zIndex = 9999;
  @Input() showLogo = false;
  @Input() showProgressBar = false;
  @Input() showSignalBars = true;
  @Input() logoSrc = 'assets/images/app/preloader/logo-preloader.svg';

  readonly isVisible = signal(true);
  readonly isHiding = signal(false);
  readonly loadingLabel = computed(() => this.languageService.t('preloaderLoadingLabel'));

  private hideTimerId: ReturnType<typeof setTimeout> | null = null;
  private fallbackTimerId: ReturnType<typeof setTimeout> | null = null;
  private cleanupTimerId: ReturnType<typeof setTimeout> | null = null;
  private loadHandler = () => this.scheduleHide();

  @HostBinding('style.display') get hostDisplay(): string {
    return 'contents';
  }

  ngOnInit(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    if (document.readyState === 'complete') {
      this.scheduleHide();
    } else {
      window.addEventListener('load', this.loadHandler, { once: true });
    }

    this.fallbackTimerId = window.setTimeout(() => {
      this.scheduleHide();
    }, this.maxVisibleMs);
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('load', this.loadHandler);
    }

    this.clearTimers();
  }

  scheduleHide(): void {
    if (!this.isVisible() || this.isHiding()) {
      return;
    }

    this.clearTimer('hide');
    this.hideTimerId = window.setTimeout(() => {
      this.isHiding.set(true);
      this.cleanupTimerId = window.setTimeout(() => {
        this.isVisible.set(false);
      }, this.animationDurationMs);
    }, this.hideDelayMs);
  }

  private clearTimers(): void {
    this.clearTimer('hide');
    this.clearTimer('fallback');
    this.clearTimer('cleanup');
  }

  private clearTimer(timer: 'hide' | 'fallback' | 'cleanup'): void {
    const timerId =
      timer === 'hide'
        ? this.hideTimerId
        : timer === 'fallback'
          ? this.fallbackTimerId
          : this.cleanupTimerId;

    if (timerId !== null) {
      clearTimeout(timerId);
    }

    if (timer === 'hide') {
      this.hideTimerId = null;
    } else if (timer === 'fallback') {
      this.fallbackTimerId = null;
    } else {
      this.cleanupTimerId = null;
    }
  }
}
