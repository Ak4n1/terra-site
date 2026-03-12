import { Component, computed } from '@angular/core';

@Component({
  selector: 'ui-current-date',
  standalone: true,
  templateUrl: './current-date.component.html',
  styleUrl: './current-date.component.css'
})
export class CurrentDateComponent {
  private readonly currentDate = new Date();

  readonly formattedDate = computed(() =>
    new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(this.currentDate)
  );
}
