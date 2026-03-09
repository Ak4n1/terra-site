import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'ui-language-flag-trigger',
  standalone: true,
  templateUrl: './language-flag-trigger.component.html',
  styleUrl: './language-flag-trigger.component.css'
})
export class LanguageFlagTriggerComponent {
  @Input() flagSrc = '';
  @Input() flagAlt = '';
  @Input() ariaLabel = 'Language';
  @Input() expanded = false;

  @Output() readonly trigger = new EventEmitter<void>();

  onTrigger(): void {
    this.trigger.emit();
  }
}
