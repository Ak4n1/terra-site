import { Injectable, WritableSignal, signal } from '@angular/core';
import { CheckCircle2, CircleAlert, TriangleAlert, type LucideIconData } from 'lucide-angular';
import type { AlertVariant } from '../atoms/alert/alert.component';

export type ToastItem = {
  id: number;
  message: string;
  variant: AlertVariant;
  icon: LucideIconData;
  durationMs: number;
};

export type ShowToastOptions = {
  variant?: AlertVariant;
  icon?: LucideIconData;
  durationMs?: number;
};

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly nextId = signal(1);
  private readonly toastList = signal<ToastItem[]>([]);
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();

  readonly toasts: WritableSignal<ToastItem[]> = this.toastList;

  show(message: string, options?: ShowToastOptions): number {
    const id = this.nextId();
    this.nextId.set(id + 1);

    const toast: ToastItem = {
      id,
      message,
      variant: options?.variant ?? 'warning',
      icon: options?.icon ?? this.defaultIconFor(options?.variant ?? 'warning'),
      durationMs: options?.durationMs ?? 3200
    };

    this.toastList.update(current => [...current, toast]);
    this.scheduleRemoval(toast);
    return id;
  }

  success(message: string, options?: Omit<ShowToastOptions, 'variant'>): number {
    return this.show(message, { ...options, variant: 'success' });
  }

  warning(message: string, options?: Omit<ShowToastOptions, 'variant'>): number {
    return this.show(message, { ...options, variant: 'warning' });
  }

  error(message: string, options?: Omit<ShowToastOptions, 'variant'>): number {
    return this.show(message, { ...options, variant: 'error' });
  }

  remove(id: number): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }

    this.toastList.update(current => current.filter(toast => toast.id !== id));
  }

  private scheduleRemoval(toast: ToastItem): void {
    if (toast.durationMs <= 0) {
      return;
    }

    const timer = setTimeout(() => {
      this.remove(toast.id);
    }, toast.durationMs);

    this.timers.set(toast.id, timer);
  }

  private defaultIconFor(variant: AlertVariant): LucideIconData {
    if (variant === 'success') {
      return CheckCircle2;
    }

    if (variant === 'error') {
      return TriangleAlert;
    }

    return CircleAlert;
  }
}
