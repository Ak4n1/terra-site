import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CookieService {
  private readonly document = inject(DOCUMENT);

  get(name: string): string | null {
    const cookieString = this.document.cookie;
    if (!cookieString) {
      return null;
    }

    const cookies = cookieString.split(';');
    for (const cookie of cookies) {
      const [rawName, ...rawValue] = cookie.trim().split('=');
      if (rawName === name) {
        return decodeURIComponent(rawValue.join('='));
      }
    }

    return null;
  }
}
