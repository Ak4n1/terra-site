import { Component, Input } from '@angular/core';

@Component({
  selector: 'ui-field-label',
  standalone: true,
  templateUrl: './field-label.component.html',
  styleUrl: './field-label.component.css'
})
export class FieldLabelComponent {
  @Input() text = '';
}
