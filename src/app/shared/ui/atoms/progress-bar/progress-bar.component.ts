import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export type ProgressBarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xlg' | 'base';
export type ProgressBarVariant =
  | 'default'
  | 'main-1'
  | 'main-2'
  | 'main-3'
  | 'main-4'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'gray-4';

@Component({
  selector: 'ui-progress-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './progress-bar.component.html',
  styleUrl: './progress-bar.component.css'
})
export class ProgressBarComponent {
  @Input() title = '';
  @Input() value = 0;
  @Input() size: ProgressBarSize = 'base';
  @Input() variant: ProgressBarVariant = 'default';
  @Input() showPercent = true;

  get clampedValue(): number {
    return Math.min(100, Math.max(0, this.value));
  }

  get sizeClass(): string {
    return this.size === 'base' ? '' : `ui-progress-bar--${this.size}`;
  }

  get variantClass(): string {
    return `ui-progress-bar__fill--${this.variant}`;
  }
}
