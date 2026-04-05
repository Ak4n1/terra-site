import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { EyeClosed, EyeOff, LucideAngularModule, Search, X } from 'lucide-angular';
import { FieldLabelComponent } from '../../atoms/field-label/field-label.component';
import {
  InputControlComponent,
  type InputControlVariant
} from '../../atoms/input-control/input-control.component';

@Component({
  selector: 'ui-input-field',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, FieldLabelComponent, InputControlComponent],
  templateUrl: './input-field.component.html',
  styleUrl: './input-field.component.css'
})
export class InputFieldComponent {
  readonly eyeClosedIcon = EyeClosed;
  readonly eyeOffIcon = EyeOff;
  readonly searchIcon = Search;
  readonly clearIcon = X;

  @Input() label = '';
  @Input() type: 'text' | 'email' | 'password' = 'text';
  @Input() placeholder = '';
  @Input() autocomplete = '';
  @Input() value = '';
  @Input() variant: InputControlVariant = 'default';
  @Input() clearable = false;
  @Input() searchMode = false;
  @Input() disabled = false;
  @Input() maxLength: number | null = null;
  @Output() readonly valueChange = new EventEmitter<string>();

  passwordVisible = false;

  get currentType(): string {
    if (this.type !== 'password') {
      return this.type;
    }

    return this.passwordVisible ? 'text' : 'password';
  }

  togglePasswordVisibility(): void {
    if (this.type !== 'password' || this.disabled) {
      return;
    }

    this.passwordVisible = !this.passwordVisible;
  }

  onValueChange(value: string): void {
    if (this.disabled) {
      return;
    }

    this.value = value;
    this.valueChange.emit(value);
  }

  clearValue(): void {
    if (this.disabled || (!this.clearable && !this.searchMode) || this.type === 'password' || this.value.length === 0) {
      return;
    }

    this.onValueChange('');
  }
}
