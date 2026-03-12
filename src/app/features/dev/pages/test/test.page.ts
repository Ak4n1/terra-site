import { Component, HostListener, inject } from '@angular/core';
import { Bell } from 'lucide-angular';
import { LanguageService } from '../../../../core/i18n/language.service';
import { ButtonComponent } from '../../../../shared/ui/atoms/button/button.component';
import { ProgressBarComponent } from '../../../../shared/ui/atoms/progress-bar/progress-bar.component';
import { AccordionComponent, type AccordionItem } from '../../../../shared/ui/organisms/accordion/accordion.component';
import { AuthOverlayComponent } from '../../../../shared/ui/organisms/auth-overlay/auth-overlay.component';
import { ModalComponent } from '../../../../shared/ui/organisms/modal/modal.component';
import { ToastService } from '../../../../shared/ui/services/toast.service';

@Component({
  selector: 'app-test-page',
  standalone: true,
  imports: [ButtonComponent, ProgressBarComponent, ModalComponent, AccordionComponent, AuthOverlayComponent],
  templateUrl: './test.page.html',
  styleUrl: './test.page.css'
})
export class TestPage {
  readonly languageService = inject(LanguageService);
  private readonly toastService = inject(ToastService);
  readonly toastBellIcon = Bell;
  activeModal: 'default' | 'large' | 'small' | null = null;
  sidePanelOpen = false;
  authPanelOpen = false;
  authMode: 'login' | 'register' = 'login';
  authCartStyleOpen = false;
  authCartStyleMode: 'login' | 'register' = 'login';
  readonly accordionItems: AccordionItem[] = [
    {
      title: 'Collapsible 1',
      content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'
    },
    {
      title: 'Collapsible 2',
      content: 'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.'
    },
    {
      title: 'Collapsible 3',
      content: 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.'
    }
  ];

  openModal(modal: 'default' | 'large' | 'small'): void {
    this.activeModal = modal;
  }

  closeModal(): void {
    this.activeModal = null;
  }

  toggleSidePanel(): void {
    this.sidePanelOpen = !this.sidePanelOpen;
  }

  closeSidePanel(): void {
    this.sidePanelOpen = false;
  }

  openAuthPanel(mode: 'login' | 'register'): void {
    this.authMode = mode;
    this.authPanelOpen = true;
  }

  closeAuthPanel(): void {
    this.authPanelOpen = false;
  }

  setAuthMode(mode: 'login' | 'register'): void {
    this.authMode = mode;
  }

  toggleAuthCartStyle(mode?: 'login' | 'register'): void {
    if (mode) {
      this.authCartStyleMode = mode;
      this.authCartStyleOpen = true;
      return;
    }

    this.authCartStyleOpen = !this.authCartStyleOpen;
  }

  closeAuthCartStyle(): void {
    this.authCartStyleOpen = false;
  }

  setAuthCartStyleMode(mode: 'login' | 'register'): void {
    this.authCartStyleMode = mode;
  }

  showToast(): void {
    this.toastService.warning('This is a toast preview using the same visual language as alerts.', {
      icon: this.toastBellIcon,
      durationMs: 3200
    });
  }

  t(key: string): string {
    return this.languageService.t(key);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.activeModal) {
      this.closeModal();
    }

    if (this.authPanelOpen) {
      this.closeAuthPanel();
    }

    if (this.authCartStyleOpen) {
      this.closeAuthCartStyle();
    }

    if (this.sidePanelOpen) {
      this.closeSidePanel();
    }
  }
}
