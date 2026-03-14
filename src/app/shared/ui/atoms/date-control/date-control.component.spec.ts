import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DateControlComponent } from './date-control.component';
import { LanguageService } from '../../../../core/i18n/language.service';

function getDayButtons(root: HTMLElement): HTMLButtonElement[] {
  return Array.from(root.querySelectorAll<HTMLButtonElement>('.ui-date-control__day'));
}

function getCurrentMonthButtons(root: HTMLElement): HTMLButtonElement[] {
  return getDayButtons(root).filter((button) => !button.classList.contains('ui-date-control__day--outside'));
}

describe('DateControlComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DateControlComponent]
    }).compileComponents();
  });

  it('renders spanish weekday headers starting on monday', () => {
    const fixture = TestBed.createComponent(DateControlComponent);
    const component = fixture.componentInstance;
    const language = TestBed.inject(LanguageService);
    const root = fixture.nativeElement as HTMLElement;
    language.setLanguage('es');
    component.isOpen.set(true);

    fixture.detectChanges();

    const weekdayLabels = Array.from(
      root.querySelectorAll('.ui-date-control__weekday')
    ).map((node) => (node as HTMLElement).textContent?.trim());

    expect(weekdayLabels).toEqual(['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom']);
  });

  it('renders 29 in-month days for february 2028', () => {
    const fixture = TestBed.createComponent(DateControlComponent);
    const component = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;
    component.isOpen.set(true);
    component.displayMonth.set(new Date(2028, 1, 1));

    fixture.detectChanges();

    const monthButtons = getCurrentMonthButtons(root);
    expect(monthButtons).toHaveLength(29);
    expect(monthButtons.at(-1)?.textContent?.trim()).toBe('29');
  });

  it('renders 28 in-month days for february 2027', () => {
    const fixture = TestBed.createComponent(DateControlComponent);
    const component = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;
    component.isOpen.set(true);
    component.displayMonth.set(new Date(2027, 1, 1));

    fixture.detectChanges();

    const monthButtons = getCurrentMonthButtons(root);
    expect(monthButtons).toHaveLength(28);
    expect(monthButtons.some((button) => button.textContent?.trim() === '29')).toBe(false);
  });

  it('emits the selected leap day and closes the panel', () => {
    const fixture = TestBed.createComponent(DateControlComponent);
    const component = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;
    const emitSpy = vi.spyOn(component.valueChange, 'emit');

    component.isOpen.set(true);
    component.displayMonth.set(new Date(2028, 1, 1));
    fixture.detectChanges();

    const leapDayButton = getCurrentMonthButtons(root)
      .find((button) => button.textContent?.trim() === '29');

    expect(leapDayButton).toBeTruthy();
    leapDayButton!.click();
    fixture.detectChanges();

    expect(emitSpy).toHaveBeenCalledWith('2028-02-29');
    expect(component.value).toBe('2028-02-29');
    expect(component.isOpen()).toBe(false);
  });

  it('disables previous navigation at the 100-year lower bound', () => {
    const fixture = TestBed.createComponent(DateControlComponent);
    const component = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;

    component.isOpen.set(true);
    component.displayMonth.set(new Date(component.today.getFullYear() - 100, 0, 1));
    fixture.detectChanges();

    const previousButton = root.querySelector('.ui-date-control__nav') as HTMLButtonElement | null;
    expect(previousButton).toBeTruthy();
    expect(previousButton?.disabled).toBe(true);
    expect(component.canGoPrevious()).toBe(false);
  });

  it('disables days outside the provided min and max range', () => {
    const fixture = TestBed.createComponent(DateControlComponent);
    const component = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;

    component.min = '2026-03-10';
    component.max = '2026-03-20';
    component.isOpen.set(true);
    component.displayMonth.set(new Date(2026, 2, 1));
    fixture.detectChanges();

    const monthButtons = getCurrentMonthButtons(root);
    const day9 = monthButtons.find((button) => button.textContent?.trim() === '9');
    const day10 = monthButtons.find((button) => button.textContent?.trim() === '10');
    const day20 = monthButtons.find((button) => button.textContent?.trim() === '20');
    const day21 = monthButtons.find((button) => button.textContent?.trim() === '21');

    expect(day9?.disabled).toBe(true);
    expect(day10?.disabled).toBe(false);
    expect(day20?.disabled).toBe(false);
    expect(day21?.disabled).toBe(true);
  });
});
