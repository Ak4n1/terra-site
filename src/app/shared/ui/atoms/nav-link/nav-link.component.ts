import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'ui-nav-link',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './nav-link.component.html',
  styleUrl: './nav-link.component.css'
})
export class NavLinkComponent {
  @Input() label = '';
  @Input() href = '#';
  @Input() routerLink: string | null = null;
  @Input() mobile = false;
  @Input() icon = '';
  @Input() active = false;
  @Input() drop = false;
  @Input() showDots = false;
  @Input() dropdown = false;
  @Input() splitEffect = false;
  @Input() dotPosition: 'bottom' | 'left' = 'bottom';
  @Output() readonly clicked = new EventEmitter<MouseEvent>();
}
