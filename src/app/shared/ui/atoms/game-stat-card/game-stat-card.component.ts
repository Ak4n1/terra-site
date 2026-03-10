import { Component, Input } from '@angular/core';
import { AnimatedCounterComponent } from '../animated-counter/animated-counter.component';

@Component({
  selector: 'ui-game-stat-card',
  standalone: true,
  imports: [AnimatedCounterComponent],
  templateUrl: './game-stat-card.component.html',
  styleUrl: './game-stat-card.component.css'
})
export class GameStatCardComponent {
  @Input() value = 0;
  @Input() label = '';
  @Input() showDivider = true;
}
