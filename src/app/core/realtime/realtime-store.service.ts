import { Injectable, signal } from '@angular/core';
import type { RealtimeConnectionState } from './realtime.models';

@Injectable({ providedIn: 'root' })
export class RealtimeStoreService {
  readonly connectionState = signal<RealtimeConnectionState>('idle');

  setConnectionState(state: RealtimeConnectionState): void {
    this.connectionState.set(state);
  }

  reset(): void {
    this.connectionState.set('idle');
  }
}
