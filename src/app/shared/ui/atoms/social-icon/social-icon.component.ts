import { Component, Input } from '@angular/core';

@Component({
  selector: 'ui-social-icon',
  standalone: true,
  templateUrl: './social-icon.component.html',
  styleUrl: './social-icon.component.css'
})
export class SocialIconComponent {
  @Input() href = '#';
  @Input() title = '';
  @Input() iconClass = '';
  @Input() mobile = false;
}
