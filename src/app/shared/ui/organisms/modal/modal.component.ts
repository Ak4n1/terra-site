import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

export type ModalSize = 'default' | 'large' | 'small';

@Component({
  selector: 'ui-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.css'
})
export class ModalComponent {
  @Input() open = false;
  @Input() title = '';
  @Input() size: ModalSize = 'default';
  @Output() readonly closed = new EventEmitter<void>();

  close(): void {
    this.closed.emit();
  }
}
