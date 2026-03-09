import { Component } from '@angular/core';
import { NavbarComponent } from './shared/ui/organisms/navbar/navbar.component';

@Component({
  selector: 'app-root',
  imports: [NavbarComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {}
