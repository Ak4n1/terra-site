import { Routes } from '@angular/router';
import { HomePage } from './features/public/pages/home/home.page';
import { TestPage } from './features/dev/pages/test/test.page';

export const routes: Routes = [
  { path: '', component: HomePage },
  { path: 'test', component: TestPage },
  { path: '**', redirectTo: '' }
];
