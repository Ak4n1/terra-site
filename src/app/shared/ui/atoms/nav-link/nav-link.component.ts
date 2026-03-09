import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'ui-nav-link',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './nav-link.component.html',
  styleUrl: './nav-link.component.css'
})
export class NavLinkComponent {
  @Input() label = '';
  @Input() href = '#';
  @Input() mobile = false;
  @Input() icon = '';
  @Input() active = false;
  @Input() drop = false;
  @Input() showDots = false;
  @Input() dropdown = false;
  @Input() splitEffect = false;
}
