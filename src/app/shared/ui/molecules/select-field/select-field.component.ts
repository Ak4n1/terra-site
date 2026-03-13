import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FieldLabelComponent } from '../../atoms/field-label/field-label.component';
import {
  SelectControlComponent,
  type SelectControlOption
} from '../../atoms/select-control/select-control.component';

@Component({
  selector: 'ui-select-field',
  standalone: true,
  imports: [CommonModule, FieldLabelComponent, SelectControlComponent],
  templateUrl: './select-field.component.html',
  styleUrl: './select-field.component.css'
})
export class SelectFieldComponent {
  @Input() label = '';
  @Input() value = '';
  @Input() placeholder = '';
  @Input() ariaLabel = '';
  @Input() disabled = false;
  @Input() options: SelectControlOption[] = [];
  @Output() readonly valueChange = new EventEmitter<string>();

  onValueChange(value: string): void {
    this.value = value;
    this.valueChange.emit(value);
  }
}
