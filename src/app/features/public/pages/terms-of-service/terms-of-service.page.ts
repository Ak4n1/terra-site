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
  selector: 'app-terms-of-service-page',
  standalone: true,
  imports: [CommonModule, ButtonComponent, SitePreloaderComponent],
  templateUrl: './terms-of-service.page.html',
  styleUrl: './terms-of-service.page.css'
})
export class TermsOfServicePage {
  readonly languageService = inject(LanguageService);
  private readonly router = inject(Router);
  readonly isTermsPage = true;
  heroParallaxOffset = 0;

  constructor() {
    this.updateParallaxOffset();
  }

  readonly sections: LegalSection[] = [
    { titleKey: 'legalTermsSection1Title', paragraphs: ['legalTermsSection1P1'] },
    { titleKey: 'legalTermsSection2Title', paragraphs: ['legalTermsSection2P1'] },
    { titleKey: 'legalTermsSection3Title', paragraphs: ['legalTermsSection3P1'] },
    {
      titleKey: 'legalTermsSection4Title',
      paragraphs: ['legalTermsSection4P1', 'legalTermsSection4P2'],
      bullets: [
        'legalTermsSection4Rule1',
        'legalTermsSection4Rule2',
        'legalTermsSection4Rule3',
        'legalTermsSection4Rule4',
        'legalTermsSection4Rule5',
        'legalTermsSection4Rule6'
      ]
    },
    { titleKey: 'legalTermsSection5Title', paragraphs: ['legalTermsSection5P1'] },
    { titleKey: 'legalTermsSection6Title', paragraphs: ['legalTermsSection6P1'] },
    { titleKey: 'legalTermsSection7Title', paragraphs: ['legalTermsSection7P1'] },
    { titleKey: 'legalTermsSection8Title', paragraphs: ['legalTermsSection8P1'] },
    { titleKey: 'legalTermsSection9Title', paragraphs: ['legalTermsSection9P1'] },
    { titleKey: 'legalTermsSection10Title', paragraphs: ['legalTermsSection10P1'] },
    { titleKey: 'legalTermsSection11Title', paragraphs: ['legalTermsSection11P1'] },
    { titleKey: 'legalTermsSection12Title', paragraphs: ['legalTermsSection12P1'] }
  ];

  t(key: string): string {
    return this.languageService.t(key);
  }

  goToTerms(): void {
    if (!this.isTermsPage) {
      void this.router.navigateByUrl('/terms-of-service');
    }
  }

  goToPrivacy(): void {
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
