import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { EyeClosed, EyeOff, LucideAngularModule } from 'lucide-angular';
import { FieldLabelComponent } from '../../atoms/field-label/field-label.component';
import { InputControlComponent } from '../../atoms/input-control/input-control.component';

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

  @Input() label = '';
  @Input() type: 'text' | 'email' | 'password' = 'text';
  @Input() placeholder = '';
  @Input() autocomplete = '';
  @Input() value = '';
  @Output() readonly valueChange = new EventEmitter<string>();

  passwordVisible = false;

  get currentType(): string {
    if (this.type !== 'password') {
      return this.type;
    }

    return this.passwordVisible ? 'text' : 'password';
  }

  togglePasswordVisibility(): void {
    if (this.type !== 'password') {
      return;
    }

    this.passwordVisible = !this.passwordVisible;
  }

  onValueChange(value: string): void {
    this.value = value;
    this.valueChange.emit(value);
  }
}
