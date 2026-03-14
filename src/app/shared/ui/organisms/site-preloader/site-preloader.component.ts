import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  Renderer2,
  ViewChild,
  inject
} from '@angular/core';
import { gsap } from 'gsap';
import { SteppedEase } from 'gsap/all';

@Component({
  selector: 'ui-site-preloader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './site-preloader.component.html',
  styleUrl: './site-preloader.component.css'
})
export class SitePreloaderComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('preloader', { static: true }) private readonly preloaderRef!: ElementRef<HTMLElement>;
  @ViewChild('preloaderBG', { static: true }) private readonly preloaderBGRef!: ElementRef<HTMLElement>;
  @ViewChild('skipBtn', { static: true }) private readonly skipBtnRef!: ElementRef<HTMLElement>;
  @ViewChild('content', { static: true }) private readonly contentRef!: ElementRef<HTMLElement>;
  @ViewChild('preloadAnim', { static: true }) private readonly preloadAnimRef!: ElementRef<HTMLDivElement>;

  private readonly renderer = inject(Renderer2);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly platformId = inject(PLATFORM_ID);

  private isFirstLoad = true;
  private resourcesLoaded = false;
  private preloaderClosed = false;
  private angularReady = false;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private intervals: ReturnType<typeof setInterval>[] = [];
  private skipUnlisten: (() => void) | null = null;

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.detectAngularReady();
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.renderer.setStyle(document.body, 'overflow', 'hidden');
    this.renderer.setStyle(document.documentElement, 'overflow', 'hidden');
    this.renderer.addClass(document.body, 'scrollbar-hidden');
    this.renderer.addClass(document.documentElement, 'scrollbar-hidden');

    this.isFirstLoad = !sessionStorage.getItem('terra_web_loaded');

    const preloader = this.host.nativeElement.querySelector('.nk-preloader') as HTMLElement | null;
    const preloaderBG = this.host.nativeElement.querySelector('.nk-preloader-bg') as HTMLElement | null;
    const skipBtn = this.host.nativeElement.querySelector('.nk-preloader-skip') as HTMLElement | null;
    const content = this.host.nativeElement.querySelector('.nk-preloader-content') as HTMLElement | null;

    if (!preloader || !preloaderBG || !skipBtn || !content) {
      return;
    }

    const closeFrames = Number.parseInt(preloaderBG.getAttribute('data-close-frames') ?? '', 10) || 23;
    const closeSpeed = Number.parseFloat(preloaderBG.getAttribute('data-close-speed') ?? '') || 1.2;
    const closeSprites = preloaderBG.getAttribute('data-close-sprites')
      || 'assets/images/app/preloader/preloader.png';
    const openFrames = Number.parseInt(preloaderBG.getAttribute('data-open-frames') ?? '', 10) || 23;
    const openSpeed = Number.parseFloat(preloaderBG.getAttribute('data-open-speed') ?? '') || 1.2;
    const openSprites = preloaderBG.getAttribute('data-open-sprites')
      || 'assets/images/app/preloader/preloader.png';

    const prepareImage = (image: string, frames: number): void => {
      preloaderBG.style.backgroundImage = `url("${image}")`;
      preloaderBG.style.width = `${frames * 100}%`;
      preloaderBG.style.transform = 'translateX(100%)';
    };

    const animateBG = (
      frames: number,
      speed: number,
      from: number,
      to: number,
      cb: () => void
    ): void => {
      gsap.set(preloaderBG, { x: `${from}%` });
      gsap.to(preloaderBG, {
        duration: speed,
        x: `${to}%`,
        ease: SteppedEase.config(frames),
        force3D: true,
        onComplete: cb
      });
    };

    const fadeOutPreloader = (cb?: () => void): void => {
      gsap.to([content, skipBtn], {
        duration: 0.3,
        y: -20,
        opacity: 0,
        display: 'none',
        force3D: true
      });

      gsap.to(preloader, {
        duration: 0.3,
        opacity: 0,
        display: 'none',
        force3D: true,
        delay: 0.2,
        onComplete: () => {
          this.renderer.setStyle(document.body, 'overflow', 'auto');
          this.renderer.setStyle(document.documentElement, 'overflow', 'auto');
          this.renderer.removeClass(document.body, 'scrollbar-hidden');
          this.renderer.removeClass(document.documentElement, 'scrollbar-hidden');
          cb?.();
        }
      });
    };

    prepareImage(openSprites, openFrames);
    preloader.style.opacity = '1';
    preloader.style.display = 'block';
    gsap.set(preloaderBG, { x: '100%' });
    gsap.set([content, skipBtn], { y: 0, opacity: 1, display: 'block' });
    console.log('[preloader] mounted with first sprite frame');

    if (this.isFirstLoad) {
      this.waitForCompleteLoad(() => {
        this.closePreloader(
          preloader,
          preloaderBG,
          skipBtn,
          content,
          closeSprites,
          closeFrames,
          closeSpeed,
          prepareImage,
          animateBG,
          fadeOutPreloader
        );
      });
    } else {
      this.pushTimer(window.setTimeout(() => {
        this.closePreloader(
          preloader,
          preloaderBG,
          skipBtn,
          content,
          closeSprites,
          closeFrames,
          closeSpeed,
          prepareImage,
          animateBG,
          fadeOutPreloader
        );
      }, 0));
    }

    this.skipUnlisten = this.renderer.listen(skipBtn, 'click', () => {
      this.closePreloader(
        preloader,
        preloaderBG,
        skipBtn,
        content,
        closeSprites,
        closeFrames,
        closeSpeed,
        prepareImage,
        animateBG,
        fadeOutPreloader
      );
    });
  }

  ngOnDestroy(): void {
    this.skipUnlisten?.();
    this.timers.forEach((timer) => clearTimeout(timer));
    this.intervals.forEach((intervalId) => clearInterval(intervalId));
    gsap.killTweensOf('*');
    this.renderer.setStyle(document.body, 'overflow', 'auto');
    this.renderer.setStyle(document.documentElement, 'overflow', 'auto');
    this.renderer.removeClass(document.body, 'scrollbar-hidden');
    this.renderer.removeClass(document.documentElement, 'scrollbar-hidden');
  }

  private detectAngularReady(): void {
    const checkAngularReady = (): void => {
      if (
        document.readyState === 'complete'
        && typeof window !== 'undefined'
        && window.performance
        && 'timing' in window.performance
      ) {
        const timing = window.performance.timing;
        const loadTime = timing.loadEventEnd - timing.navigationStart;

        if (loadTime > 0) {
          this.angularReady = true;
          return;
        }
      }

      this.pushTimer(window.setTimeout(checkAngularReady, 100));
    };

    checkAngularReady();
  }

  private waitForCompleteLoad(callback: () => void): void {
    const criticalResources = ['assets/images/app/preloader/preloader.png'];

    let loadedCount = 0;
    const totalResources = criticalResources.length;

    const checkResource = (url: string): Promise<void> => new Promise((resolve) => {
      const image = new Image();
      image.onload = () => {
        loadedCount += 1;
        if (loadedCount >= totalResources) {
          resolve();
        }
      };
      image.onerror = () => {
        loadedCount += 1;
        if (loadedCount >= totalResources) {
          resolve();
        }
      };
      image.src = url;
    });

    const checkComplete = (): void => {
      if (this.resourcesLoaded && this.angularReady) {
        callback();
      }
    };

    Promise.all(criticalResources.map((url) => checkResource(url))).then(() => {
      this.pushTimer(window.setTimeout(() => {
        this.resourcesLoaded = true;
        checkComplete();
      }, 300));
    });

    const angularCheck = window.setInterval(() => {
      if (this.angularReady) {
        clearInterval(angularCheck);
        checkComplete();
      }
    }, 100);

    this.pushInterval(angularCheck);

    this.pushTimer(window.setTimeout(() => {
      clearInterval(angularCheck);
      if (!this.resourcesLoaded || !this.angularReady) {
        this.resourcesLoaded = true;
        this.angularReady = true;
        callback();
      }
    }, 4000));
  }

  private closePreloader(
    preloader: HTMLElement,
    preloaderBG: HTMLElement,
    skipBtn: HTMLElement,
    content: HTMLElement,
    closeSprites: string,
    closeFrames: number,
    closeSpeed: number,
    prepareImage: (image: string, frames: number) => void,
    animateBG: (frames: number, speed: number, from: number, to: number, cb: () => void) => void,
    fadeOutPreloader: (cb?: () => void) => void,
    cb?: () => void
  ): void {
    if (this.preloaderClosed) {
      return;
    }

    this.preloaderClosed = true;
    console.log('[preloader] close animation started');

    if (this.isFirstLoad) {
      sessionStorage.setItem('terra_web_loaded', 'true');
    }

    if (this.preloadAnimRef?.nativeElement) {
      gsap.to(this.preloadAnimRef.nativeElement, {
        duration: 1,
        opacity: 0,
        display: 'none',
        force3D: true
      });
    }

    prepareImage(closeSprites, closeFrames);
    animateBG(closeFrames, closeSpeed, 100, 0, () => {
      fadeOutPreloader(cb ?? (() => undefined));
    });
  }

  private pushTimer(timer: ReturnType<typeof setTimeout>): void {
    this.timers.push(timer);
  }

  private pushInterval(intervalId: ReturnType<typeof setInterval>): void {
    this.intervals.push(intervalId);
  }
}
