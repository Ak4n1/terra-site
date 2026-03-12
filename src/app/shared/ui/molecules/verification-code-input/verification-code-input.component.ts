import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, EventEmitter, Input, Output, QueryList, ViewChildren } from '@angular/core';
import { InputControlComponent } from '../../atoms/input-control/input-control.component';

@Component({
  selector: 'ui-verification-code-input',
  standalone: true,
  imports: [CommonModule, InputControlComponent],
  templateUrl: './verification-code-input.component.html',
  styleUrl: './verification-code-input.component.css'
})
export class VerificationCodeInputComponent implements AfterViewInit {
  @ViewChildren(InputControlComponent) private readonly controls?: QueryList<InputControlComponent>;

  @Input() value = '';
  @Input() length = 6;
  @Input() disabled = false;
  @Input() ariaLabelPrefix = 'Code digit';
  @Input() placeholder = '';
  @Output() readonly valueChange = new EventEmitter<string>();
  @Output() readonly enterPressed = new EventEmitter<void>();

  digits: string[] = [];

  ngAfterViewInit(): void {
    this.syncDigitsFromValue();
  }

  ngOnChanges(): void {
    this.syncDigitsFromValue();
  }

  onDigitInput(index: number, rawValue: string): void {
    const digit = this.extractDigit(rawValue);
    this.digits[index] = digit;
    this.emitValue();

    if (digit && index < this.length - 1) {
      this.focusAt(index + 1);
    }
  }

  onDigitKeydown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.enterPressed.emit();
      return;
    }

    if (event.key === 'Backspace' && !this.digits[index] && index > 0) {
      this.focusAt(index - 1);
      return;
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      this.focusAt(index - 1);
      return;
    }

    if (event.key === 'ArrowRight' && index < this.length - 1) {
      event.preventDefault();
      this.focusAt(index + 1);
    }
  }

  onDigitPaste(event: ClipboardEvent): void {
    const pasted = event.clipboardData?.getData('text') ?? '';
    const sanitized = pasted.replace(/\D/g, '').slice(0, this.length);
    if (!sanitized) {
      return;
    }

    event.preventDefault();
    const nextDigits = sanitized.split('');
    this.digits = Array.from({ length: this.length }, (_, index) => nextDigits[index] ?? '');
    this.emitValue();

    const nextIndex = Math.min(sanitized.length, this.length - 1);
    this.focusAt(nextIndex);
  }

  trackByIndex(index: number): number {
    return index;
  }

  private syncDigitsFromValue(): void {
    const sanitized = (this.value ?? '').replace(/\D/g, '').slice(0, this.length);
    const nextDigits = sanitized.split('');
    this.digits = Array.from({ length: this.length }, (_, index) => nextDigits[index] ?? '');
  }

  private emitValue(): void {
    this.value = this.digits.join('');
    this.valueChange.emit(this.value);
  }

  private focusAt(index: number): void {
    const controls = this.controls?.toArray();
    controls?.[index]?.focus();
  }

  private extractDigit(value: string): string {
    const match = value.match(/\d/);
    return match ? match[0] : '';
  }
}
