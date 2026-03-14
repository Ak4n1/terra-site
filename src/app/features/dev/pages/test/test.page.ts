import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { Bell } from 'lucide-angular';
import { LanguageService } from '../../../../core/i18n/language.service';
import { ButtonComponent, type ButtonSize, type ButtonVariant } from '../../../../shared/ui/atoms/button/button.component';
import { DateControlComponent } from '../../../../shared/ui/atoms/date-control/date-control.component';
import { ProgressBarComponent } from '../../../../shared/ui/atoms/progress-bar/progress-bar.component';
import { AccordionComponent, type AccordionItem } from '../../../../shared/ui/organisms/accordion/accordion.component';
import { AuthOverlayComponent } from '../../../../shared/ui/organisms/auth-overlay/auth-overlay.component';
import { ModalComponent } from '../../../../shared/ui/organisms/modal/modal.component';
import { ToastService } from '../../../../shared/ui/services/toast.service';

type ButtonShowcaseExample = {
  name: string;
  label: string;
  variant: ButtonVariant;
  size: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string | null;
};

type ButtonShowcasePage = {
  id: string;
  title: string;
  copy: string;
  examples: ButtonShowcaseExample[];
};

type PaginationShowcasePage = {
  id: string;
  title: string;
  copy: string;
};

@Component({
  selector: 'app-test-page',
  standalone: true,
  imports: [ButtonComponent, DateControlComponent, ProgressBarComponent, ModalComponent, AccordionComponent, AuthOverlayComponent],
  templateUrl: './test.page.html',
  styleUrl: './test.page.css'
})
export class TestPage {
  readonly languageService = inject(LanguageService);
  private readonly toastService = inject(ToastService);
  private readonly today = new Date();
  private readonly todayIso = this.toIsoDate(this.today);
  private readonly thirteenDaysAgoIso = this.toIsoDate(new Date(this.today.getFullYear(), this.today.getMonth(), this.today.getDate() - 13));
  readonly toastBellIcon = Bell;
  readonly currentPaginationPage = signal(0);
  readonly auditDateFrom = signal(this.thirteenDaysAgoIso);
  readonly auditDateTo = signal(this.todayIso);
  activeModal: 'default' | 'large' | 'small' | null = null;
  sidePanelOpen = false;
  authPanelOpen = false;
  authMode: 'login' | 'register' = 'login';
  authCartStyleOpen = false;
  authCartStyleMode: 'login' | 'register' = 'login';
  readonly buttonExamples: ButtonShowcaseExample[] = [
    {
      name: 'btn-color-main-1',
      label: 'Confirm',
      variant: 'main-1',
      size: 'md'
    },
    {
      name: 'btn-color-main-2',
      label: 'Approve',
      variant: 'main-2',
      size: 'md'
    },
    {
      name: 'btn-color-main-3',
      label: 'Open panel',
      variant: 'main-3',
      size: 'md'
    },
    {
      name: 'btn-color-main-4',
      label: 'Teleport',
      variant: 'main-4',
      size: 'md'
    },
    {
      name: 'btn-color-main-5',
      label: 'Delete',
      variant: 'main-5',
      size: 'md'
    },
    {
      name: 'btn-color-white',
      label: 'Neutral',
      variant: 'white',
      size: 'md'
    },
    {
      name: 'main-1 / x2',
      label: 'Continue',
      variant: 'main-1',
      size: 'x2'
    },
    {
      name: 'disabled neutral',
      label: 'Unavailable',
      variant: 'white',
      size: 'md',
      disabled: true
    },
    {
      name: 'loading main-1',
      label: 'Send mail',
      variant: 'main-1',
      size: 'x2',
      loading: true,
      loadingLabel: 'Sending mail'
    }
  ];
  readonly paginationShowcasePages: PaginationShowcasePage[] = [
    { id: '1', title: 'Overview', copy: 'Primer bloque de contenido paginado para ver un estado base.' },
    { id: '2', title: 'Players', copy: 'Segundo estado de navegacion con pagina intermedia.' },
    { id: '3', title: 'Store', copy: 'Una pagina central para probar seleccion activa y lectura visual.' },
    { id: '4', title: 'Notifications', copy: 'Sirve para revisar densidad cuando ya hay varias paginas.' },
    { id: '5', title: 'Support', copy: 'Otra pagina intermedia para testear equilibrio entre numeros y botones.' },
    { id: '6', title: 'Archive', copy: 'Ultima pagina para validar disabled de next y cierre del flujo.' }
  ];
  readonly visiblePaginationPage = computed(() => this.paginationShowcasePages[this.currentPaginationPage()]);
  readonly hasPreviousPaginationPage = computed(() => this.currentPaginationPage() > 0);
  readonly hasNextPaginationPage = computed(() => this.currentPaginationPage() < this.paginationShowcasePages.length - 1);
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

  goToPaginationPage(index: number): void {
    if (index < 0 || index >= this.paginationShowcasePages.length) {
      return;
    }

    this.currentPaginationPage.set(index);
  }

  previousPaginationPage(): void {
    this.goToPaginationPage(this.currentPaginationPage() - 1);
  }

  nextPaginationPage(): void {
    this.goToPaginationPage(this.currentPaginationPage() + 1);
  }

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

  private toIsoDate(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
