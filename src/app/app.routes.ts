import { Routes } from '@angular/router';
import { HomePage } from './features/public/pages/home/home.page';

export const routes: Routes = [
  { path: '', component: HomePage },
  { path: '**', redirectTo: '' }
];
