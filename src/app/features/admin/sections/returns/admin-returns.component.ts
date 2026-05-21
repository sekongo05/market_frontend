import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ReturnService } from '../../../../core/services/return.service';
import { ReturnResponse, ReturnDecisionRequest, ReturnStatus } from '../../../../core/models/return.models';
import { PageResponse } from '../../../../core/models/common.models';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { AdminToastService } from '../../shared/admin-toast.service';
import { ScrollLockService } from '../../../../core/services/scroll-lock.service';
import { returnStatusLabel, returnStatusClass } from '../../shared/admin-status.helpers';

@Component({
  selector: 'app-admin-returns',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-returns.component.html',
})
export class AdminReturnsComponent implements OnInit, OnDestroy {
  returns: ReturnResponse[] = [];
  returnsLoading = false;
  returnsPage = 0;
  returnsTotalPages = 0;
  returnsTotalElements = 0;
  pendingCount = 0;

  /* ── Filtres ── */
  filterStatus: ReturnStatus | '' = '';
  searchQuery = '';
  private readonly search$ = new Subject<string>();

  /* ── Décision ── */
  returnDecisionModal = false;
  returnDecisionItem: ReturnResponse | null = null;
  returnDecision: ReturnStatus = 'APPROVED';
  returnDecisionNote = '';
  returnRefundAmount: number | null = null;
  returnDecisionLoading = false;

  readonly returnStatusLabel = returnStatusLabel;
  readonly returnStatusClass = returnStatusClass;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private returnService: ReturnService,
    private wsService: WebSocketService,
    private toast: AdminToastService,
    private scrollLock: ScrollLockService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadReturns(0);
    this.loadPendingCount();
    this.search$.pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => this.loadReturns(0));
    this.wsService.staffEvent$.pipe(takeUntil(this.destroy$)).subscribe(e => {
      if (e.module === 'returns') { this.loadReturns(0); this.loadPendingCount(); }
    });
  }

  ngOnDestroy(): void {
    this.scrollLock.forceUnlock();
    this.destroy$.next();
    this.destroy$.complete();
  }

  get returnPages(): number[] { return Array.from({ length: this.returnsTotalPages }, (_, i) => i); }

  get hasActiveFilters(): boolean { return !!this.filterStatus || !!this.searchQuery; }

  onSearchChange(): void { this.search$.next(this.searchQuery); }

  applyFilter(): void { this.loadReturns(0); }

  clearFilters(): void {
    this.filterStatus = '';
    this.searchQuery  = '';
    this.loadReturns(0);
  }

  isUrgentReturn(ret: ReturnResponse): boolean {
    return ret.status === 'PENDING'
      && (Date.now() - new Date(ret.createdAt).getTime()) / 3_600_000 > 48;
  }

  loadReturns(page = 0): void {
    this.returnsLoading = true;
    this.returnService.getAllReturns(
      this.filterStatus || undefined,
      page,
      15,
      this.searchQuery.trim() || undefined,
    ).subscribe({
      next: (r) => {
        if (r.success) {
          const pg = r.data as PageResponse<ReturnResponse>;
          this.returns             = pg.content;
          this.returnsTotalPages   = pg.totalPages;
          this.returnsTotalElements = pg.totalElements;
          this.returnsPage = page;
        }
        this.returnsLoading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.returnsLoading = false; this.cdr.markForCheck(); },
    });
  }

  loadPendingCount(): void {
    this.returnService.getAllReturns('PENDING', 0, 1).subscribe({
      next: (r) => {
        if (r.success) this.pendingCount = (r.data as PageResponse<ReturnResponse>).totalElements;
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }

  openReturnDecisionModal(ret: ReturnResponse): void {
    this.returnDecisionItem  = ret;
    this.returnDecision      = 'APPROVED';
    this.returnDecisionNote  = '';
    this.returnRefundAmount  = null;
    this.returnDecisionModal = true;
    this.scrollLock.lock();
    this.cdr.markForCheck();
  }

  closeReturnDecisionModal(): void {
    this.returnDecisionModal = false;
    this.returnDecisionItem  = null;
    this.scrollLock.unlock();
    this.cdr.markForCheck();
  }

  onDecisionChange(): void {
    if (this.returnDecision === 'COMPLETED') {
      this.returnRefundAmount = this.returnDecisionItem?.orderTotalAmount ?? null;
    } else {
      this.returnRefundAmount = null;
    }
    this.cdr.markForCheck();
  }

  submitReturnDecision(): void {
    if (!this.returnDecisionItem) return;
    this.returnDecisionLoading = true;
    const data: ReturnDecisionRequest = {
      decision:     this.returnDecision,
      adminNote:    this.returnDecisionNote.trim() || undefined,
      refundAmount: this.returnDecision === 'COMPLETED' && this.returnRefundAmount != null
                      ? this.returnRefundAmount
                      : undefined,
    };
    this.returnService.processDecision(this.returnDecisionItem.id, data).subscribe({
      next: (r) => {
        if (r.success) {
          const idx = this.returns.findIndex(ret => ret.id === this.returnDecisionItem!.id);
          if (idx !== -1) { this.returns = [...this.returns]; this.returns[idx] = r.data; }
          this.toast.show('Décision enregistrée');
          this.loadPendingCount();
          this.closeReturnDecisionModal();
        }
        this.returnDecisionLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.returnDecisionLoading = false;
        this.toast.show(err?.error?.message || 'Erreur', 'error');
        this.cdr.markForCheck();
      },
    });
  }
}
