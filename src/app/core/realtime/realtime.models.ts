export type RealtimeConnectionState = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

export interface RealtimeEventMessage {
  id?: string;
  type: string;
  version?: number;
  occurredAt?: string;
  traceId?: string | null;
  data?: Record<string, unknown> | null;
}
