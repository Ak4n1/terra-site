import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { AuthFacadeService } from '../../features/auth/services/auth-facade.service';
import { environment } from '../../../environments/environment';
import type { RealtimeConnectionState, RealtimeEventMessage } from './realtime.models';
import { RealtimeStoreService } from './realtime-store.service';

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private static readonly MAX_RECONNECT_ATTEMPTS = 6;
  private static readonly MAX_RECONNECT_DELAY_MS = 30_000;

  private readonly authFacade = inject(AuthFacadeService);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly store = inject(RealtimeStoreService);
  private readonly eventSubject = new Subject<RealtimeEventMessage>();

  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimerId: number | null = null;
  private intentionallyClosed = false;
  readonly events$ = this.eventSubject.asObservable();

  constructor() {
    const subscription = this.authFacade.authState$.subscribe(state => {
      if (state === 'authenticated') {
        this.ensureConnected();
        return;
      }

      this.disconnect(true);
      this.store.reset();
    });

    this.destroyRef.onDestroy(() => {
      subscription.unsubscribe();
      this.disconnect(true);
    });
  }

  private ensureConnected(): void {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const url = this.resolveRealtimeUrl();
    if (!url) {
      this.store.setConnectionState('error');
      return;
    }

    this.clearReconnectTimer();
    this.intentionallyClosed = false;
    this.store.setConnectionState('connecting');

    const socket = new WebSocket(url);
    this.socket = socket;

    socket.onopen = () => {
      this.reconnectAttempts = 0;
      this.store.setConnectionState('connected');
    };

    socket.onmessage = event => {
      this.handleMessage(event.data);
    };

    socket.onerror = () => {
      this.store.setConnectionState('error');
    };

    socket.onclose = () => {
      this.socket = null;

      if (this.intentionallyClosed) {
        this.store.setConnectionState('idle');
        return;
      }

      this.store.setConnectionState('disconnected');
      this.scheduleReconnect();
    };
  }

  private disconnect(intentional: boolean): void {
    this.intentionallyClosed = intentional;
    this.clearReconnectTimer();

    if (!this.socket) {
      return;
    }

    const activeSocket = this.socket;
    this.socket = null;

    if (activeSocket.readyState === WebSocket.OPEN || activeSocket.readyState === WebSocket.CONNECTING) {
      activeSocket.close(1000, 'client_shutdown');
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= RealtimeService.MAX_RECONNECT_ATTEMPTS) {
      this.store.setConnectionState('error');
      return;
    }

    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, RealtimeService.MAX_RECONNECT_DELAY_MS);
    this.reconnectAttempts += 1;

    const windowRef = this.document.defaultView;
    if (!windowRef) {
      return;
    }

    this.reconnectTimerId = windowRef.setTimeout(() => {
      this.reconnectTimerId = null;
      if (this.authFacade.sessionSnapshot) {
        this.ensureConnected();
      }
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimerId === null) {
      return;
    }

    this.document.defaultView?.clearTimeout(this.reconnectTimerId);
    this.reconnectTimerId = null;
  }

  private handleMessage(rawMessage: unknown): void {
    if (typeof rawMessage !== 'string') {
      return;
    }

    let message: RealtimeEventMessage;
    try {
      message = JSON.parse(rawMessage) as RealtimeEventMessage;
    } catch {
      return;
    }

    this.eventSubject.next(message);

    switch (message.type) {
      case 'system.connected':
        this.store.setConnectionState('connected');
        break;
      case 'system.ping':
        this.sendClientEvent('system.pong', { receivedAt: new Date().toISOString() });
        break;
      case 'account.session.revoked':
      case 'system.refresh_required':
        this.disconnect(true);
        this.store.setConnectionState('disconnected');
        if (!this.authFacade.isLogoutInProgressSnapshot) {
          void firstValueFrom(this.authFacade.bootstrapSession());
        }
        break;
      default:
        break;
    }
  }

  private sendClientEvent(type: string, data: Record<string, unknown>): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    const payload: RealtimeEventMessage = {
      id: `cli_${crypto.randomUUID()}`,
      type,
      version: 1,
      occurredAt: new Date().toISOString(),
      data
    };

    this.socket.send(JSON.stringify(payload));
  }

  private resolveRealtimeUrl(): string | null {
    const windowRef = this.document.defaultView;
    if (!windowRef) {
      return null;
    }

    if (!environment.apiBaseUrl) {
      const protocol = windowRef.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${windowRef.location.host}/api/ws`;
    }

    try {
      const url = new URL(environment.apiBaseUrl, windowRef.location.origin);
      const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${url.host}/api/ws`;
    } catch {
      return null;
    }
  }
}
