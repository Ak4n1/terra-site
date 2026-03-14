import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NotificationSoundService {
  private readonly document = inject(DOCUMENT);
  private audio: HTMLAudioElement | null = null;

  play(): void {
    const windowRef = this.document.defaultView;
    if (!windowRef || typeof Audio === 'undefined') {
      return;
    }

    const audio = this.getAudio();
    if (!audio) {
      return;
    }

    try {
      audio.currentTime = 0;
      void audio.play().catch(() => {
        // Ignorar bloqueos de autoplay del navegador.
      });
    } catch {
      // Ignorar errores de audio para no romper el flujo de notificaciones.
    }
  }

  private getAudio(): HTMLAudioElement | null {
    if (this.audio) {
      return this.audio;
    }

    try {
      const audio = new Audio('/assets/sounds/notification.mp3');
      audio.preload = 'auto';
      this.audio = audio;
      return audio;
    } catch {
      return null;
    }
  }
}
