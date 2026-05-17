import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../../../../core/services/dashboard.service';

@Component({
  selector: 'app-manager-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink],
  templateUrl: './manager-dashboard.component.html',
})
export class ManagerDashboardComponent implements OnInit {

  managerStats: any = null;
  managerStatsLoading = false;

  constructor(
    private dashboardService: DashboardService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void { this.loadManagerStats(); }

  loadManagerStats(): void {
    this.managerStatsLoading = true;
    this.dashboardService.getManagerStats().subscribe({
      next: (r) => { if (r.success) this.managerStats = r.data; this.managerStatsLoading = false; this.cdr.markForCheck(); },
      error: () => { this.managerStatsLoading = false; this.cdr.markForCheck(); },
    });
  }

  formatCurrency(amount: number): string {
    if (amount >= 1_000_000) return (amount / 1_000_000).toFixed(1) + 'M';
    if (amount >= 1_000) return Math.round(amount / 1_000) + 'K';
    return amount.toString();
  }
}
