import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ReturnService } from '../../../../core/services/return.service';
import { ReturnResponse, ReturnDecisionRequest } from '../../../../core/models/return.models';
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
  returnDecisionModal = false;
  returnDecisionItem: ReturnResponse | null = null;
  returnDecision: 'APPROVED' | 'REJECTED' | 'COMPLETED' = 'APPROVED';
  returnDecisionNote = '';
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
    this.wsService.staffEvent$.pipe(takeUntil(this.destroy$)).subscribe(e => {
      if (e.module === 'returns') this.loadReturns(0);
    });
  }

  ngOnDestroy(): void {
    this.scrollLock.forceUnlock();
    this.destroy$.next();
    this.destroy$.complete();
  }

  get returnPages(): number[] { return Array.from({ length: this.returnsTotalPages }, (_, i) => i); }

  loadReturns(page = 0): void {
    this.returnsLoading = true;
    this.returnService.getAllReturns(undefined, page, 15).subscribe({
      next: (r) => {
        if (r.success) {
          const pg = r.data as any;
          this.returns = pg.content;
          this.returnsTotalPages = pg.totalPages;
          this.returnsPage = page;
        }
        this.returnsLoading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.returnsLoading = false; this.cdr.markForCheck(); },
    });
  }

  openReturnDecisionModal(ret: ReturnResponse): void {
    this.returnDecisionItem = ret;
    this.returnDecision = 'APPROVED';
    this.returnDecisionNote = '';
    this.returnDecisionModal = true;
    this.scrollLock.lock();
    this.cdr.markForCheck();
  }

  closeReturnDecisionModal(): void {
    this.returnDecisionModal = false;
    this.returnDecisionItem = null;
    this.scrollLock.unlock();
    this.cdr.markForCheck();
  }

  submitReturnDecision(): void {
    if (!this.returnDecisionItem) return;
    this.returnDecisionLoading = true;
    const data: ReturnDecisionRequest = {
      decision: this.returnDecision,
      adminNote: this.returnDecisionNote.trim() || undefined,
    };
    this.returnService.processDecision(this.returnDecisionItem.id, data).subscribe({
      next: (r) => {
        if (r.success) {
          const idx = this.returns.findIndex(ret => ret.id === this.returnDecisionItem!.id);
          if (idx !== -1) { this.returns = [...this.returns]; this.returns[idx] = r.data; }
          this.toast.show('Décision enregistrée ✓');
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
