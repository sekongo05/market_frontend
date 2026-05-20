import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReturnService } from '../../core/services/return.service';
import { AuthService } from '../../core/services/auth.service';
import { ReturnResponse, ReturnStatus } from '../../core/models/return.models';
import { PageResponse } from '../../core/models/common.models';

@Component({
  selector: 'app-returns',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink],
  templateUrl: './returns.component.html',
})
export class ReturnsComponent implements OnInit {
  isAuthenticated = false;
  myReturns: ReturnResponse[] = [];
  returnsLoading = false;
  returnsPage = 0;
  returnsTotalPages = 0;

  constructor(
    private returnService: ReturnService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.isAuthenticated = this.authService.isAuthenticated();
    if (this.isAuthenticated) {
      this.loadMyReturns(0);
    }
  }

  loadMyReturns(page: number): void {
    this.returnsLoading = true;
    this.returnService.getMyReturns(page, 5).subscribe({
      next: (r) => {
        if (r.success) {
          const pg = r.data as PageResponse<ReturnResponse>;
          this.myReturns = pg.content;
          this.returnsTotalPages = pg.totalPages;
          this.returnsPage = page;
        }
        this.returnsLoading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.returnsLoading = false; this.cdr.markForCheck(); },
    });
  }

  statusLabel(status: ReturnStatus): string {
    return {
      PENDING:   'En attente',
      APPROVED:  'Accepté',
      REJECTED:  'Refusé',
      COMPLETED: 'Traité',
    }[status] ?? status;
  }

  statusColor(status: ReturnStatus): string {
    return {
      PENDING:   'bg-amber-500/15 text-amber-400 border-amber-500/30',
      APPROVED:  'bg-green-500/15 text-green-400 border-green-500/30',
      REJECTED:  'bg-red-500/15 text-red-400 border-red-500/30',
      COMPLETED: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    }[status] ?? 'bg-black/10 theme-muted';
  }

  get returnPages(): number[] {
    return Array.from({ length: this.returnsTotalPages }, (_, i) => i);
  }
}
