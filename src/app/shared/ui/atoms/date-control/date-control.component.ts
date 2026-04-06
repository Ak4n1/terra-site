import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  computed,
  inject,
  signal
} from '@angular/core';
import { CalendarDays, ChevronLeft, ChevronRight, LucideAngularModule } from 'lucide-angular';
import { LanguageService } from '../../../../core/i18n/language.service';
import { addDays, calendarStart, isDisabled, isSameDate, parseIsoDate, startOfDay, startOfMonth, toIsoDate } from './date-control.utils';

type ViewMode = 'days' | 'months' | 'years';

type CalendarDayCell = {
  iso: string;
  label: number;
  outsideMonth: boolean;
  selected: boolean;
  today: boolean;
  disabled: boolean;
};

type MonthCell = {
  index: number;
  label: string;
  selected: boolean;
  current: boolean;
};

type YearCell = {
  year: number;
  selected: boolean;
  current: boolean;
};

@Component({
  selector: 'ui-date-control',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './date-control.component.html',
  styleUrl: './date-control.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DateControlComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly languageService = inject(LanguageService);

  private _value = '';
  private readonly valueState = signal('');
  private readonly minState = signal<string | null>(null);
  private readonly maxState = signal<string | null>(null);
  private readonly placeholderState = signal('Select a date');
  private readonly ariaLabelState = signal('');

  @Input()
  set value(next: string) {
    this._value = next ?? '';
    this.valueState.set(this._value);
    const parsed = parseIsoDate(this._value);
    if (parsed) {
      const clamped = parsed < this.navigationMinDate ? this.navigationMinDate : parsed;
      this.displayMonth.set(startOfMonth(clamped));
    }
  }

  get value(): string {
    return this._value;
  }

  @Input()
  set placeholder(next: string) {
    this.placeholderState.set(next ?? 'Select a date');
  }

  get placeholder(): string {
    return this.placeholderState();
  }

  @Input() disabled = false;

  @Input()
  set min(next: string | null) {
    this.minState.set(next);
  }

  get min(): string | null {
    return this.minState();
  }

  @Input()
  set max(next: string | null) {
    this.maxState.set(next);
  }

  get max(): string | null {
    return this.maxState();
  }

  @Input()
  set ariaLabel(next: string) {
    this.ariaLabelState.set(next ?? '');
  }

  get ariaLabel(): string {
    return this.ariaLabelState();
  }

  @Output() readonly valueChange = new EventEmitter<string>();

  readonly calendarIcon = CalendarDays;
  readonly chevronLeftIcon = ChevronLeft;
  readonly chevronRightIcon = ChevronRight;
  readonly isOpen = signal(false);
  readonly viewMode = signal<ViewMode>('days');
  readonly displayMonth = signal(startOfMonth(new Date()));
  readonly today = startOfDay(new Date());
  readonly navigationMinDate = startOfDay(new Date(this.today.getFullYear() - 100, 0, 1));
  readonly currentLocale = computed(() => this.resolveLocale(this.languageService.language()));
  readonly canGoPrevious = computed(() => {
    const visible = this.displayMonth();

    if (this.viewMode() === 'days') {
      return visible.getFullYear() > this.navigationMinDate.getFullYear()
        || visible.getMonth() > this.navigationMinDate.getMonth();
    }

    if (this.viewMode() === 'months') {
      return visible.getFullYear() > this.navigationMinDate.getFullYear();
    }

    return this.yearRangeStart() > this.navigationMinDate.getFullYear();
  });

  readonly selectedDate = computed(() => parseIsoDate(this.valueState()));
  readonly triggerAriaLabel = computed(() =>
    this.ariaLabelState() || this.placeholderState() || this.languageService.t('dateControlPlaceholder')
  );
  readonly panelAriaLabel = computed(() => this.ariaLabelState() || this.languageService.t('dateControlPanelLabel'));
  readonly displayLabel = computed(() => {
    const selected = this.selectedDate();
    if (!selected) {
      return this.placeholderState() || this.languageService.t('dateControlPlaceholder');
    }

    return new Intl.DateTimeFormat(this.currentLocale(), { dateStyle: 'medium' }).format(selected);
  });

  readonly periodLabel = computed(() => {
    const locale = this.currentLocale();
    const visible = this.displayMonth();

    if (this.viewMode() === 'months') {
      return String(visible.getFullYear());
    }

    if (this.viewMode() === 'years') {
      const start = this.yearRangeStart();
      return `${start} - ${start + 11}`;
    }

    return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' })
      .format(visible)
      .replace('.', '')
      .toUpperCase();
  });

  readonly periodAriaLabel = computed(() =>
    this.viewMode() === 'days' ? this.languageService.t('dateControlChooseMonthYear') :
      this.viewMode() === 'months' ? this.languageService.t('dateControlChooseYear') :
      this.languageService.t('dateControlChooseDate')
  );

  readonly previousAriaLabel = computed(() =>
    this.viewMode() === 'days' ? this.languageService.t('dateControlPreviousMonth') :
      this.viewMode() === 'months' ? this.languageService.t('dateControlPreviousYear') :
      this.languageService.t('dateControlPreviousYearRange')
  );

  readonly nextAriaLabel = computed(() =>
    this.viewMode() === 'days' ? this.languageService.t('dateControlNextMonth') :
      this.viewMode() === 'months' ? this.languageService.t('dateControlNextYear') :
      this.languageService.t('dateControlNextYearRange')
  );

  readonly weekdayLabels = computed(() => {
    const locale = this.currentLocale();
    const start = new Date(2021, 7, 2); // Monday
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(day).replace('.', '');
    });
  });

  readonly dayCells = computed(() => {
    const month = this.displayMonth();
    const start = calendarStart(month);
    const selected = this.selectedDate();
    const min = parseIsoDate(this.minState());
    const max = parseIsoDate(this.maxState());

    return Array.from({ length: 42 }, (_, index) => {
      const cellDate = addDays(start, index);
      const iso = toIsoDate(cellDate);
      return {
        iso,
        label: cellDate.getDate(),
        outsideMonth: cellDate.getMonth() !== month.getMonth(),
        selected: !!selected && isSameDate(cellDate, selected),
        today: isSameDate(cellDate, this.today),
        disabled: isDisabled(cellDate, min, max)
      } satisfies CalendarDayCell;
    });
  });

  readonly monthCells = computed(() => {
    const month = this.displayMonth();
    const selected = this.selectedDate();
    const locale = this.currentLocale();

    return Array.from({ length: 12 }, (_, index) => {
      const date = new Date(month.getFullYear(), index, 1);
      return {
        index,
        label: new Intl.DateTimeFormat(locale, { month: 'short' }).format(date).replace('.', ''),
        selected: !!selected && selected.getMonth() === index && selected.getFullYear() === month.getFullYear(),
        current: this.today.getMonth() === index && this.today.getFullYear() === month.getFullYear()
      } satisfies MonthCell;
    });
  });

  readonly yearRangeStart = computed(() => {
    const year = this.displayMonth().getFullYear();
    return year - (year % 12);
  });

  readonly yearCells = computed(() => {
    const selected = this.selectedDate();
    const start = this.yearRangeStart();

    return Array.from({ length: 12 }, (_, index) => {
      const year = start + index;
      return {
        year,
        selected: !!selected && selected.getFullYear() === year,
        current: this.today.getFullYear() === year
      } satisfies YearCell;
    });
  });

  toggleOpen(): void {
    if (this.disabled) {
      return;
    }

    const next = !this.isOpen();
    this.isOpen.set(next);
    if (next) {
      this.viewMode.set('days');
    }
  }

  close(): void {
    this.isOpen.set(false);
    this.viewMode.set('days');
  }

  previous(): void {
    if (!this.canGoPrevious()) {
      return;
    }

    const month = this.displayMonth();
    if (this.viewMode() === 'days') {
      this.displayMonth.set(startOfMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1)));
      return;
    }

    if (this.viewMode() === 'months') {
      this.displayMonth.set(startOfMonth(new Date(month.getFullYear() - 1, month.getMonth(), 1)));
      return;
    }

    this.displayMonth.set(startOfMonth(new Date(month.getFullYear() - 12, month.getMonth(), 1)));
  }

  next(): void {
    const month = this.displayMonth();
    if (this.viewMode() === 'days') {
      this.displayMonth.set(startOfMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1)));
      return;
    }

    if (this.viewMode() === 'months') {
      this.displayMonth.set(startOfMonth(new Date(month.getFullYear() + 1, month.getMonth(), 1)));
      return;
    }

    this.displayMonth.set(startOfMonth(new Date(month.getFullYear() + 12, month.getMonth(), 1)));
  }

  cycleViewMode(): void {
    if (this.viewMode() === 'days') {
      this.viewMode.set('months');
      return;
    }

    if (this.viewMode() === 'months') {
      this.viewMode.set('years');
      return;
    }

    this.viewMode.set('days');
  }

  selectDay(cell: CalendarDayCell): void {
    if (cell.disabled) {
      return;
    }

    this._value = cell.iso;
    this.valueState.set(cell.iso);
    this.valueChange.emit(cell.iso);
    this.displayMonth.set(startOfMonth(parseIsoDate(cell.iso)!));
    this.close();
  }

  selectMonth(monthIndex: number): void {
    const visible = this.displayMonth();
    this.displayMonth.set(startOfMonth(new Date(visible.getFullYear(), monthIndex, 1)));
    this.viewMode.set('days');
  }

  selectYear(year: number): void {
    const visible = this.displayMonth();
    this.displayMonth.set(startOfMonth(new Date(year, visible.getMonth(), 1)));
    this.viewMode.set('months');
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isOpen()) {
      return;
    }

    const target = event.target as Node | null;
    if (target && this.host.nativeElement.contains(target)) {
      return;
    }

    this.close();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  private resolveLocale(language: string): string {
    return language === 'es' ? 'es-AR' :
      language === 'pt' ? 'pt-BR' :
      language === 'fr' ? 'fr-FR' :
      language === 'de' ? 'de-DE' :
      'en-US';
  }

}
