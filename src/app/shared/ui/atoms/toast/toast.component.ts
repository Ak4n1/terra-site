import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CircleAlert, LucideAngularModule, type LucideIconData } from 'lucide-angular';
import type { AlertVariant } from '../alert/alert.component';

@Component({
  selector: 'ui-toast',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.css'
})
export class ToastComponent {
  @Input() variant: AlertVariant = 'warning';
  @Input() message = '';
  @Input() icon: LucideIconData = CircleAlert;
  @Output() readonly dismissed = new EventEmitter<void>();

  get variantClass(): string {
    return `ui-toast--${this.variant}`;
  }

  dismiss(): void {
    this.dismissed.emit();
  }
}
