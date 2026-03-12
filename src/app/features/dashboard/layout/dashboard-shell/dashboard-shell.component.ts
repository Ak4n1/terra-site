import { DOCUMENT } from '@angular/common';
import { Component, OnDestroy, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DashboardTopbarComponent } from '../../../../shared/ui/organisms/dashboard-topbar/dashboard-topbar.component';
import { SidebarComponent } from '../../../../shared/ui/organisms/sidebar/sidebar.component';

@Component({
  selector: 'app-dashboard-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, DashboardTopbarComponent],
  templateUrl: './dashboard-shell.component.html',
  styleUrl: './dashboard-shell.component.css'
})
export class DashboardShellComponent {
  private readonly document = inject(DOCUMENT);
  mobileSidebarOpen = false;

  toggleMobileSidebar(): void {
    this.mobileSidebarOpen = !this.mobileSidebarOpen;
    this.syncBodyScroll();
  }

  closeMobileSidebar(): void {
    this.mobileSidebarOpen = false;
    this.syncBodyScroll();
  }

  private syncBodyScroll(): void {
    const body = this.document?.body;
    if (!body) {
      return;
    }

    body.style.overflow = this.mobileSidebarOpen ? 'hidden' : '';
  }

  ngOnDestroy(): void {
    const body = this.document?.body;
    if (body) {
      body.style.overflow = '';
    }
  }
}
