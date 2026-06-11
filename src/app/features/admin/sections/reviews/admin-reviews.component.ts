import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ReviewService } from '../../../../core/services/review.service';
import { ReviewResponse } from '../../../../core/models/review.models';
import { PageResponse } from '../../../../core/models/common.models';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { AdminToastService } from '../../shared/admin-toast.service';

@Component({
  selector: 'app-admin-reviews',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './admin-reviews.component.html',
})
export class AdminReviewsComponent implements OnInit, OnDestroy {
  reviews: ReviewResponse[] = [];
  reviewsLoading = false;
  reviewsPage = 0;
  reviewsTotalPages = 0;
  reviewsTotalElements = 0;
  ratingFilter: number | undefined = undefined;
  visibilityFilter: boolean | undefined = undefined;
  expandedReviewId: number | null = null;
  deleteConfirmReview: ReviewResponse | null = null;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private reviewService: ReviewService,
    private wsService: WebSocketService,
    private toast: AdminToastService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadReviews(0);
    this.wsService.staffEvent$.pipe(takeUntil(this.destroy$)).subscribe(e => {
      if (e.module === 'reviews') this.loadReviews(0);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get reviewPages(): number[] { return Array.from({ length: this.reviewsTotalPages }, (_, i) => i); }

  loadReviews(page = 0): void {
    this.reviewsLoading = true;
    this.expandedReviewId = null;
    this.reviewService.getAllReviews(page, 20, this.ratingFilter, this.visibilityFilter).subscribe({
      next: (r) => {
        if (r.success) {
          const pg = r.data;
          this.reviews = pg.content;
          this.reviewsTotalPages = pg.totalPages;
          this.reviewsTotalElements = pg.totalElements;
          this.reviewsPage = page;
        }
        this.reviewsLoading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.reviewsLoading = false; this.cdr.markForCheck(); },
    });
  }

  setRatingFilter(rating: number | undefined): void {
    this.ratingFilter = rating;
    this.loadReviews(0);
  }

  setVisibilityFilter(v: boolean | undefined): void {
    this.visibilityFilter = v;
    this.loadReviews(0);
  }

  toggleExpand(id: number): void {
    this.expandedReviewId = this.expandedReviewId === id ? null : id;
    this.cdr.markForCheck();
  }

  toggleReviewVisibility(review: ReviewResponse): void {
    this.reviewService.toggleVisibility(review.id).subscribe({
      next: (r) => {
        if (r.success) {
          const idx = this.reviews.findIndex(rv => rv.id === review.id);
          if (idx !== -1) { this.reviews = [...this.reviews]; this.reviews[idx] = r.data; }
        }
        this.cdr.markForCheck();
      },
      error: () => this.cdr.markForCheck(),
    });
  }

  adminDeleteReview(review: ReviewResponse): void {
    this.deleteConfirmReview = review;
    this.cdr.markForCheck();
  }

  confirmDelete(): void {
    const review = this.deleteConfirmReview;
    if (!review) return;
    this.deleteConfirmReview = null;
    this.reviewService.adminDeleteReview(review.id).subscribe({
      next: () => {
        this.reviews = this.reviews.filter(rv => rv.id !== review.id);
        this.reviewsTotalElements = Math.max(0, this.reviewsTotalElements - 1);
        this.toast.show('Avis supprimé');
        this.cdr.markForCheck();
      },
      error: () => { this.toast.show('Erreur de suppression', 'error'); this.cdr.markForCheck(); },
    });
  }
}
