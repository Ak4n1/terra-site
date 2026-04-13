import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnInit, inject } from '@angular/core';
import { finalize } from 'rxjs';
import { formatDateTimeByLanguage } from '../../../../../../core/utils/date-locale.util';
import { formatUserAgentSummary } from '../../../../../../core/utils/user-agent.util';
import { LanguageService } from '../../../../../../core/i18n/language.service';
import { AlertComponent, type AlertVariant } from '../../../../../../shared/ui/atoms/alert/alert.component';
import { ButtonComponent } from '../../../../../../shared/ui/atoms/button/button.component';
import { DateControlComponent } from '../../../../../../shared/ui/atoms/date-control/date-control.component';
import { OrbSpinnerComponent } from '../../../../../../shared/ui/atoms/orb-spinner/orb-spinner.component';
import {
  AuthService,
  type AccountActivityEntry,
  type AccountActivityListResponse,
  type AccountActivitySortOrder
} from '../../../../../auth/services/auth.service';
import { AuthFacadeService } from '../../../../../auth/services/auth-facade.service';
import { SelectFieldComponent } from '../../../../../../shared/ui/molecules/select-field/select-field.component';
import type { SelectControlOption } from '../../../../../../shared/ui/atoms/select-control/select-control.component';

@Component({
  selector: 'app-activity-settings-page',
  standalone: true,
  imports: [CommonModule, AlertComponent, ButtonComponent, DateControlComponent, OrbSpinnerComponent, SelectFieldComponent],
  templateUrl: './activity-settings.page.html',
  styleUrl: './activity-settings.page.css'
})
export class ActivitySettingsPage implements OnInit {
  private static readonly DEFAULT_PAGE_SIZE = 5;
  private static readonly LOADING_MIN_MS = 0;
  private static readonly ITEM_MASK_IMAGES = [
    "url('/assets/images/app/masks/squares/34294919_rectangle_brushes_shape_1.svg')",
    "url('/assets/images/app/masks/squares/34294919_rectangle_brushes_shape_2.svg')",
    "url('/assets/images/app/masks/squares/34294919_rectangle_brushes_shape_3.svg')",
    "url('/assets/images/app/masks/squares/34294919_rectangle_brushes_shape_5.svg')"
  ] as const;

  private readonly languageService = inject(LanguageService);
  private readonly authService = inject(AuthService);
  private readonly authFacade = inject(AuthFacadeService);
  private readonly ngZone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);
  private loadSequence = 0;

  loading = false;
  items: AccountActivityEntry[] = [];
  page = 0;
  size = ActivitySettingsPage.DEFAULT_PAGE_SIZE;
  sort: AccountActivitySortOrder = 'desc';
  dateFrom = '';
  dateTo = '';
  hasMore = false;
  message = '';
  messageKind: 'warning' | 'error' = 'warning';

  ngOnInit(): void {
    this.loadActivity(0);
  }

  t(key: string, params?: Record<string, string | number>): string {
    return this.languageService.t(key, params);
  }

  alertVariant(): AlertVariant {
    return this.messageKind === 'warning' ? 'warning' : 'error';
  }

  canGoPrevious(): boolean {
    return !this.loading && this.page > 0;
  }

  canGoNext(): boolean {
    return !this.loading && this.hasMore;
  }

  sortOptions(): SelectControlOption[] {
    return [
      { value: 'desc', label: this.t('dashboardConfigurationActivitySortNewest') },
      { value: 'asc', label: this.t('dashboardConfigurationActivitySortOldest') }
    ];
  }

  onSortFilterChange(value: string): void {
    this.sort = value === 'asc' ? 'asc' : 'desc';
  }

  applyFilters(): void {
    if (!this.validateDateRange()) {
      return;
    }
    this.loadActivity(0);
  }

  clearFilters(): void {
    this.dateFrom = '';
    this.dateTo = '';
    this.message = '';
    this.loadActivity(0);
  }

  hasActiveFilters(): boolean {
    return this.dateFrom.trim().length > 0 || this.dateTo.trim().length > 0;
  }

  previousPage(): void {
    if (!this.canGoPrevious()) {
      return;
    }

    this.loadActivity(this.page - 1);
  }

  nextPage(): void {
    if (!this.canGoNext()) {
      return;
    }

    this.loadActivity(this.page + 1);
  }

  trackActivity(index: number, entry: AccountActivityEntry): string {
    return `${entry.eventKey}-${entry.occurredAt}-${index}`;
  }

  itemMaskImageForPage(index: number): string {
    const visualIndex = (this.page * this.size) + index;
    return ActivitySettingsPage.ITEM_MASK_IMAGES[
      visualIndex % ActivitySettingsPage.ITEM_MASK_IMAGES.length
    ];
  }

  formatOccurredAt(value: string): string {
    return formatDateTimeByLanguage(value, this.languageService.language());
  }

  eventTitle(entry: AccountActivityEntry): string {
    return this.resolveEventText(`dashboardConfigurationActivityEvent.${entry.eventKey}.title`, entry);
  }

  displayValue(value: string | null): string {
    if (!value || value.trim().length === 0) {
      return this.t('dashboardConfigurationActivityUnknownValue');
    }
    return value;
  }

  deviceSummary(value: string | null): string {
    return formatUserAgentSummary(value) ?? this.t('dashboardConfigurationActivityUnknownValue');
  }

  onDateFromChange(value: string): void {
    this.dateFrom = value;
  }

  onDateToChange(value: string): void {
    this.dateTo = value;
  }

  private loadActivity(page: number): void {
    const loadSequence = ++this.loadSequence;
    const loadStartedAt = Date.now();

    this.runInUi(() => {
      this.loading = true;
      this.message = '';
    });

    this.authService.getAccountActivity(page, this.size, this.sort, {
      dateFrom: this.dateFrom || undefined,
      dateTo: this.dateTo || undefined
    }).pipe(
      finalize(() => {
        const elapsed = Date.now() - loadStartedAt;
        const remaining = Math.max(0, ActivitySettingsPage.LOADING_MIN_MS - elapsed);

        setTimeout(() => {
          if (loadSequence !== this.loadSequence) {
            return;
          }

          this.runInUi(() => {
            this.loading = false;
          });
        }, remaining);
      })
    ).subscribe({
      next: response => {
        if (loadSequence !== this.loadSequence) {
          return;
        }

        this.runInUi(() => {
          this.applyResponse(response);
        });
      },
      error: (error: unknown) => {
        if (loadSequence !== this.loadSequence) {
          return;
        }

        this.runInUi(() => {
          this.items = [];
          this.hasMore = false;
          this.page = Math.max(0, page);
          this.handleApiError(error);
        });
      }
    });
  }

  private applyResponse(response: AccountActivityListResponse): void {
    this.items = response.items ?? [];
    this.hasMore = !!response.hasMore;
    this.page = Math.max(0, response.page ?? 0);
    this.size = Math.max(1, response.size ?? ActivitySettingsPage.DEFAULT_PAGE_SIZE);
  }

  private resolveEventText(key: string, entry: AccountActivityEntry): string {
    const translated = this.t(key, this.toTranslationParams(entry.metadata));
    if (translated !== key) {
      return translated;
    }

    if (key.endsWith('.title')) {
      return this.t('dashboardConfigurationActivityEventUnknownTitle');
    }

    return this.t('dashboardConfigurationActivityEventUnknownBody', { eventKey: entry.eventKey });
  }

  private toTranslationParams(metadata: Record<string, unknown> | null | undefined): Record<string, string | number> {
    if (!metadata) {
      return {};
    }

    const params: Record<string, string | number> = {};
    Object.entries(metadata).forEach(([key, value]) => {
      if (typeof value === 'string') {
        params[key] = value;
        return;
      }
      if (typeof value === 'number') {
        params[key] = value;
        return;
      }
      if (typeof value === 'boolean') {
        params[key] = value ? 'true' : 'false';
      }
    });

    return params;
  }

  private handleApiError(error: unknown): void {
    const normalized = this.authFacade.normalizeError(error);
    this.messageKind = normalized.status === 429 ? 'warning' : 'error';
    this.message = normalized.message?.trim().length
      ? normalized.message
      : this.t('dashboardConfigurationActivityLoadError');
  }

  private validateDateRange(): boolean {
    if (!this.dateFrom || !this.dateTo) {
      this.message = '';
      return true;
    }

    if (this.dateFrom <= this.dateTo) {
      this.message = '';
      return true;
    }

    this.messageKind = 'warning';
    this.message = this.t('dashboardConfigurationNotificationsDateRangeInvalid');
    return false;
  }

  private runInUi(action: () => void): void {
    if (NgZone.isInAngularZone()) {
      action();
      this.cdr.markForCheck();
      return;
    }

    this.ngZone.run(() => {
      action();
      this.cdr.markForCheck();
    });
  }
}
