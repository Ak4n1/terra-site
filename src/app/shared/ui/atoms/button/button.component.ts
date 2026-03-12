import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

export type ButtonVariant =
  | 'main-1'
  | 'main-2'
  | 'main-3'
  | 'main-4'
  | 'main-5'
  | 'white';

export type ButtonSize = 'md' | 'x2';

@Component({
  selector: 'ui-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './button.component.html',
  styleUrl: './button.component.css'
})
export class ButtonComponent {
  @Input() label = 'Button';
  @Input() variant: ButtonVariant = 'main-1';
  @Input() size: ButtonSize = 'md';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() form: string | null = null;
  @Input() disabled = false;
  @Input() loading = false;
  @Input() loadingLabel: string | null = null;
  @Output() readonly clicked = new EventEmitter<MouseEvent>();

  get variantClass(): string {
    return `btn-color-${this.variant}`;
  }

  get sizeClass(): string {
    return this.size === 'x2' ? 'btn--x2' : '';
  }

  get resolvedDisabled(): boolean {
    return this.disabled || this.loading;
  }

  get resolvedLoadingLabel(): string {
    return this.loadingLabel?.trim() || this.label;
  }

  onClick(event: MouseEvent): void {
    if (this.resolvedDisabled) {
      return;
    }

    this.clicked.emit(event);
  }
}
