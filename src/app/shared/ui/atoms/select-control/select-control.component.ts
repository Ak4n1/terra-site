import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, HostListener, Input, Output, signal } from '@angular/core';

export type SelectControlOption = {
  value: string;
  label: string;
};

@Component({
  selector: 'ui-select-control',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './select-control.component.html',
  styleUrls: ['./select-control.component.css']
})
export class SelectControlComponent {
  @Input() value = '';
  @Input() disabled = false;
  @Input() ariaLabel = '';
  @Input() placeholder = '';
  @Input() options: SelectControlOption[] = [];
  @Output() readonly valueChange = new EventEmitter<string>();

  readonly open = signal(false);
  readonly activeIndex = signal(-1);

  constructor(private readonly elementRef: ElementRef<HTMLElement>) {}

  selectedOption(): SelectControlOption | null {
    return this.options.find(option => option.value === this.value) ?? null;
  }

  toggle(): void {
    if (this.disabled) {
      return;
    }

    const nextOpen = !this.open();
    this.open.set(nextOpen);
    this.activeIndex.set(nextOpen ? this.selectedIndex() : -1);
  }

  selectOption(option: SelectControlOption): void {
    if (this.disabled) {
      return;
    }

    this.value = option.value;
    this.valueChange.emit(option.value);
    this.open.set(false);
    this.activeIndex.set(this.selectedIndex());
  }

  onTriggerKeydown(event: KeyboardEvent): void {
    if (this.disabled) {
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.openWithIndex(this.nextEnabledIndex(this.activeIndex(), 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.openWithIndex(this.nextEnabledIndex(this.activeIndex(), -1));
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (this.open() && this.activeIndex() >= 0) {
          this.selectOption(this.options[this.activeIndex()]!);
        } else {
          this.toggle();
        }
        break;
      case 'Escape':
        if (this.open()) {
          event.preventDefault();
          this.close();
        }
        break;
      default:
        break;
    }
  }

  onOptionMouseEnter(index: number): void {
    this.activeIndex.set(index);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as Node | null;
    if (target && !this.elementRef.nativeElement.contains(target)) {
      this.close();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  optionId(index: number): string {
    return `ui-select-option-${index}`;
  }

  isActive(index: number): boolean {
    return this.activeIndex() === index;
  }

  private close(): void {
    this.open.set(false);
    this.activeIndex.set(-1);
  }

  private openWithIndex(index: number): void {
    this.open.set(true);
    this.activeIndex.set(index >= 0 ? index : 0);
  }

  private selectedIndex(): number {
    return this.options.findIndex(option => option.value === this.value);
  }

  private nextEnabledIndex(from: number, direction: 1 | -1): number {
    if (this.options.length === 0) {
      return -1;
    }

    if (from < 0) {
      return direction === 1 ? 0 : this.options.length - 1;
    }

    const next = from + direction;
    if (next < 0) {
      return this.options.length - 1;
    }
    if (next >= this.options.length) {
      return 0;
    }
    return next;
  }
}
