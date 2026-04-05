import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';

export type InputControlVariant = 'default' | 'editorial' | 'editorial-plain' | '2';

@Component({
  selector: 'ui-input-control',
  standalone: true,
  templateUrl: './input-control.component.html',
  styleUrl: './input-control.component.css'
})
export class InputControlComponent {
  @ViewChild('inputRef') private readonly inputRef?: ElementRef<HTMLInputElement>;

  @Input() type = 'text';
  @Input() placeholder = '';
  @Input() autocomplete = '';
  @Input() value = '';
  @Input() disabled = false;
  @Input() maxLength: number | null = null;
  @Input() inputMode = '';
  @Input() pattern = '';
  @Input() ariaLabel = '';
  @Input() variant: InputControlVariant = 'default';
  @Output() readonly valueChange = new EventEmitter<string>();

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.valueChange.emit(target?.value ?? '');
  }

  focus(): void {
    this.inputRef?.nativeElement.focus();
  }
}
