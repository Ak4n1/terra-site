import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'ui-menu-toggle',
  standalone: true,
  templateUrl: './menu-toggle.component.html',
  styleUrl: './menu-toggle.component.css'
})
export class MenuToggleComponent {
  @Input() open = false;
  @Input() ariaLabel = 'Toggle menu';

  @Output() readonly toggle = new EventEmitter<void>();

  onToggle(): void {
    this.toggle.emit();
  }
}
