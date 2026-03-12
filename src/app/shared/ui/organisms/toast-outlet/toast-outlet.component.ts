import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { ToastComponent } from '../../atoms/toast/toast.component';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'ui-toast-outlet',
  standalone: true,
  imports: [CommonModule, ToastComponent],
  templateUrl: './toast-outlet.component.html',
  styleUrl: './toast-outlet.component.css'
})
export class ToastOutletComponent {
  private readonly toastService = inject(ToastService);

  readonly toasts = computed(() => this.toastService.toasts());

  dismiss(id: number): void {
    this.toastService.remove(id);
  }
}
