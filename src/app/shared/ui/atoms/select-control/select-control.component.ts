import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

export type SelectControlOption = {
  value: string;
  label: string;
};

@Component({
  selector: 'ui-select-control',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './select-control.component.html',
  styleUrl: './select-control.component.css'
})
export class SelectControlComponent {
  @Input() value = '';
  @Input() disabled = false;
  @Input() ariaLabel = '';
  @Input() placeholder = '';
  @Input() options: SelectControlOption[] = [];
  @Output() readonly valueChange = new EventEmitter<string>();

  onValueChange(event: Event): void {
    const target = event.target as HTMLSelectElement | null;
    this.valueChange.emit(target?.value ?? '');
  }
}
