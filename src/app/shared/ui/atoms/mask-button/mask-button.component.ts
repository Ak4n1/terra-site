import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';

export type MaskButtonSize =
  | '2xs'
  | 'xs'
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl'
  | '2xl'
  | '3xl'
  | '4xl'
  | '5xl';

export type MaskButtonMask = 1 | 2 | 3 | 4 | 5 | 6 | '1' | '2' | '3' | '4' | '5' | '6';

const MASK_BUTTON_IMAGE_BY_INDEX: Record<1 | 2 | 3 | 4 | 5 | 6, string> = {
  1: "url('/assets/images/clipping_masks/button.svg?v=2')",
  2: "url('/assets/images/clipping_masks/386962049_c269581b-ec84-479a-9422-e89e15d91770_horizontal.svg')",
  3: "url('/assets/images/clipping_masks/386959710_3a06fd87-3345-4af4-a922-9dca76d8fa3d_horizontal.svg')",
  4: "url('/assets/images/clipping_masks/386962801_e8c7810c-56f2-487c-8666-b92352741cf6_horizontal.svg')",
  5: "url('/assets/images/clipping_masks/386960688_7989817e-80ee-4b0a-bf16-2d9a7da18a8c_horizontal.svg')",
  6: "url('/assets/images/clipping_masks/386959795_e196bc93-4ad0-4733-9137-f97443f09a8f_horizontal.svg')"
};

@Component({
  selector: 'ui-mask-button',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './mask-button.component.html',
  styleUrl: './mask-button.component.css'
})
export class MaskButtonComponent {
  @Input() label = 'Button';
  @Input() routerLink: string | readonly (string | number)[] | null = null;
  @Input() href: string | null = null;
  @Input() size: MaskButtonSize = 'md';
  @Input() mask: MaskButtonMask | null = null;
  @Input() active = false;
  @Input() disabled = false;
  @Input() ariaLabel: string | null = null;
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Output() readonly clicked = new EventEmitter<MouseEvent>();

  get isLink(): boolean {
    return !!this.routerLink || !!this.href;
  }

  get sizeClass(): string {
    return `ui-mask-button--${this.size}`;
  }

  get maskImage(): string | null {
    if (this.mask === null || this.mask === undefined) {
      return null;
    }

    const normalized = Number(this.mask);
    if (normalized < 1 || normalized > 6 || Number.isNaN(normalized)) {
      return MASK_BUTTON_IMAGE_BY_INDEX[1];
    }

    return MASK_BUTTON_IMAGE_BY_INDEX[normalized as 1 | 2 | 3 | 4 | 5 | 6];
  }

  onClick(event: MouseEvent): void {
    if (this.disabled) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    this.clicked.emit(event);
  }
}
