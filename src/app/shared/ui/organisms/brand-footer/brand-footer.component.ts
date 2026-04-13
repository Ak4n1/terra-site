import { Component, inject } from '@angular/core';
import { LanguageService } from '../../../../core/i18n/language.service';
import { AuthOverlayStateService } from '../../../../features/auth/services/auth-overlay-state.service';
import { ButtonComponent } from '../../atoms/button/button.component';
import { NavLinkComponent } from '../../atoms/nav-link/nav-link.component';

@Component({
  selector: 'ui-brand-footer',
  standalone: true,
  imports: [ButtonComponent, NavLinkComponent],
  templateUrl: './brand-footer.component.html',
  styleUrl: './brand-footer.component.css'
})
export class BrandFooterComponent {
  private readonly languageService = inject(LanguageService);
  private readonly authOverlayState = inject(AuthOverlayStateService);

  t(key: string): string {
    return this.languageService.t(key);
  }

  footerCopyright(): string {
    return this.languageService.t('homeFooterCopyright').replace(/^\u00c2/, '');
  }

  requestAuth(mode: 'login' | 'register', event?: Event): void {
    event?.preventDefault();
    this.authOverlayState.open(mode);
  }
}
