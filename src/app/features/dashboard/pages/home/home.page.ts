import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DiscordWidgetComponent } from '../../../../shared/ui/organisms/discord-widget/discord-widget.component';

@Component({
  selector: 'app-dashboard-home-page',
  standalone: true,
  imports: [CommonModule, DiscordWidgetComponent],
  templateUrl: './home.page.html',
  styleUrl: './home.page.css'
})
export class DashboardHomePage {}
