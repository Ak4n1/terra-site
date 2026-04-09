import { CommonModule } from '@angular/common';
import { Component, HostListener, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LanguageService } from '../../../../core/i18n/language.service';
import { ButtonComponent } from '../../../../shared/ui/atoms/button/button.component';
import { SitePreloaderComponent } from '../../../../shared/ui/organisms/site-preloader/site-preloader.component';

type LegalSection = {
  titleKey: string;
  paragraphs: string[];
  bullets?: string[];
};

@Component({
  selector: 'app-privacy-policy-page',
  standalone: true,
  imports: [CommonModule, ButtonComponent, SitePreloaderComponent],
  templateUrl: './privacy-policy.page.html',
  styleUrl: './privacy-policy.page.css'
})
export class PrivacyPolicyPage {
  readonly languageService = inject(LanguageService);
  private readonly router = inject(Router);
  readonly isTermsPage = false;
  heroParallaxOffset = 0;

  constructor() {
    this.updateParallaxOffset();
  }

  readonly sections: LegalSection[] = [
    {
      titleKey: 'legalPrivacySection1Title',
      paragraphs: [],
      bullets: ['legalPrivacySection1Item1', 'legalPrivacySection1Item2', 'legalPrivacySection1Item3']
    },
    { titleKey: 'legalPrivacySection2Title', paragraphs: ['legalPrivacySection2P1'] },
    { titleKey: 'legalPrivacySection3Title', paragraphs: ['legalPrivacySection3P1'] },
    { titleKey: 'legalPrivacySection4Title', paragraphs: ['legalPrivacySection4P1'] },
    { titleKey: 'legalPrivacySection5Title', paragraphs: ['legalPrivacySection5P1'] },
    { titleKey: 'legalPrivacySection6Title', paragraphs: ['legalPrivacySection6P1'] },
    { titleKey: 'legalPrivacySection7Title', paragraphs: ['legalPrivacySection7P1'] },
    { titleKey: 'legalPrivacySection8Title', paragraphs: ['legalPrivacySection8P1'] },
    { titleKey: 'legalPrivacySection9Title', paragraphs: ['legalPrivacySection9P1'] },
    {
      titleKey: 'legalPrivacySection10Title',
      paragraphs: [],
      bullets: ['legalPrivacySection10Item1', 'legalPrivacySection10Item2', 'legalPrivacySection10Item3']
    },
    { titleKey: 'legalPrivacySection11Title', paragraphs: ['legalPrivacySection11P1'] }
  ];

  t(key: string): string {
    return this.languageService.t(key);
  }

  goToTerms(): void {
    void this.router.navigateByUrl('/terms-of-service');
  }

  goToPrivacy(): void {
    if (!this.isTermsPage) {
      return;
    }
    void this.router.navigateByUrl('/privacy-policy');
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.updateParallaxOffset();
  }

  private updateParallaxOffset(): void {
    if (typeof window === 'undefined') {
      return;
    }
    this.heroParallaxOffset = Math.min(window.scrollY * 0.2, 120);
  }
}
