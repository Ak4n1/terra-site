import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnDestroy,
  inject
} from '@angular/core';

@Component({
  selector: 'ui-animated-counter',
  standalone: true,
  templateUrl: './animated-counter.component.html',
  styleUrl: './animated-counter.component.css'
})
export class AnimatedCounterComponent implements AfterViewInit, OnDestroy {
  private readonly ngZone = inject(NgZone);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly cdr = inject(ChangeDetectorRef);

  @Input() end = 0;
  @Input() start = 0;
  @Input() duration = 1000;
  @Input() prefix = '';
  @Input() suffix = '';

  displayValue = '0';

  private animationFrameId: number | null = null;
  private visibilityFrameId: number | null = null;
  private hasAnimated = false;
  private readonly handleViewportChange = (): void => {
    if (this.visibilityFrameId !== null || this.hasAnimated) {
      return;
    }

    this.visibilityFrameId = window.requestAnimationFrame(() => {
      this.visibilityFrameId = null;
      this.checkViewport();
    });
  };

  ngAfterViewInit(): void {
    this.displayValue = this.formatValue(this.start);
    this.cdr.detectChanges();

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

    if (this.visibilityFrameId !== null) {
      window.cancelAnimationFrame(this.visibilityFrameId);
      this.visibilityFrameId = null;
    }
  }

  private startAnimation(): void {
    const startTime = performance.now();
    const initialValue = this.start;
    const delta = this.end - this.start;

    const step = (currentTime: number): void => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / this.duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const nextValue = Math.round(initialValue + delta * easedProgress);

      this.ngZone.run(() => {
        this.displayValue = this.formatValue(nextValue);
        this.cdr.detectChanges();
      });

      if (progress < 1) {
        this.animationFrameId = window.requestAnimationFrame(step);
        return;
      }

      this.ngZone.run(() => {
        this.displayValue = this.formatValue(this.end);
        this.cdr.detectChanges();
      });
      this.animationFrameId = null;
    };

    this.animationFrameId = window.requestAnimationFrame(step);
  }

  private checkViewport(): void {
    const element = this.host.nativeElement;
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const triggerOffset = viewportHeight * 0.12;
    const isVisible = rect.top <= viewportHeight - triggerOffset && rect.bottom >= triggerOffset;

    if (!isVisible || this.hasAnimated) {
      return;
    }

    this.hasAnimated = true;
    this.startAnimation();
  }

  private formatValue(value: number): string {
    return `${this.prefix}${value}${this.suffix}`;
  }
}
