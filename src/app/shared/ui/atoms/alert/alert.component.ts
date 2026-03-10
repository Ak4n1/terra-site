import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { CheckCircle2, CircleAlert, LucideAngularModule, TriangleAlert, type LucideIconData } from 'lucide-angular';

export type AlertVariant = 'warning' | 'error' | 'success';

@Component({
  selector: 'ui-alert',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './alert.component.html',
  styleUrl: './alert.component.css'
})
export class AlertComponent {
  @Input() variant: AlertVariant = 'warning';
  @Input() message = '';

  get variantClass(): string {
    return `ui-alert--${this.variant}`;
  }

  get icon(): LucideIconData {
    if (this.variant === 'error') {
      return TriangleAlert;
    }

    if (this.variant === 'success') {
      return CheckCircle2;
    }

    return CircleAlert;
  }
}
