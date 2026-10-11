import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ReviewPromptService, ReviewPromptData, ReviewPromptProduct } from '../../core/services/review-prompt.service';
import { ReviewService } from '../../core/services/review.service';
import { ProductService } from '../../core/services/product.service';
import { MediaUrlPipe } from '../pipes/media-url.pipe';

@Component({
  selector: 'app-review-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, MediaUrlPipe],
  templateUrl: './review-modal.component.html',
  styleUrls: ['./review-modal.component.css']
})
export class ReviewModalComponent implements OnInit, OnDestroy {
  modalData: ReviewPromptData | null = null;
  selectedProduct: ReviewPromptProduct | null = null;

  rating = 0;
  hoverRating = 0;
  comment = '';
  submitting = false;
  error: string | null = null;
  successMessage: string | null = null;
  reviewedProductSlugs = new Set<string>();

  private destroy$ = new Subject<void>();

  constructor(
    private promptService: ReviewPromptService,
    private reviewService: ReviewService,
    private productService: ProductService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.promptService.prompt$
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.modalData = data;
        this.error = null;
        this.successMessage = null;
        if (data && data.products.length > 0) {
          this.selectProduct(data.products[0]);
        } else {
          this.selectedProduct = null;
        }
        this.cdr.detectChanges();
      });
  }

  selectProduct(product: ReviewPromptProduct): void {
    this.selectedProduct = product;
    this.rating = 0;
    this.hoverRating = 0;
    this.comment = '';
    this.error = null;
    this.successMessage = null;
    this.cdr.detectChanges();
  }

  setRating(val: number): void {
    this.rating = val;
    this.error = null;
  }

  setHover(val: number): void {
    this.hoverRating = val;
  }

  get displayedRating(): number {
    return this.hoverRating || this.rating;
  }

  submit(): void {
    if (!this.selectedProduct || this.rating === 0 || this.submitting) return;

    this.submitting = true;
    this.error = null;
    this.successMessage = null;

    // Si on a déjà le productId
    if (this.selectedProduct.id) {
      this._doSubmitReview(this.selectedProduct.id);
    } else {
      // Résolution du productId via le slug
      this.productService.getProductBySlug(this.selectedProduct.slug).subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.selectedProduct!.id = res.data.id;
            if (!this.selectedProduct!.imageUrl) {
              this.selectedProduct!.imageUrl = res.data.imageUrl;
            }
            this._doSubmitReview(res.data.id);
          } else {
            this.error = 'Impossible d\'identifier le produit.';
            this.submitting = false;
            this.cdr.detectChanges();
          }
        },
        error: () => {
          this.error = 'Erreur de connexion. Veuillez réessayer.';
          this.submitting = false;
          this.cdr.detectChanges();
        }
      });
    }
  }

  private _doSubmitReview(productId: number): void {
    const payload = {
      productId,
      rating: this.rating,
      comment: this.comment.trim() || undefined
    };

    this.reviewService.createReview(payload).subscribe({
      next: () => {
        this.submitting = false;
        this.reviewedProductSlugs.add(this.selectedProduct!.slug);
        this.successMessage = 'Merci pour votre avis ! ✨';
        this.cdr.detectChanges();

        // Trouver s'il reste d'autres produits à noter
        setTimeout(() => {
          const remaining = this.modalData?.products.filter(p => !this.reviewedProductSlugs.has(p.slug)) || [];
          if (remaining.length > 0) {
            this.selectProduct(remaining[0]);
          } else {
            // Tout a été noté, fermeture douce
            this.close();
          }
        }, 1200);
      },
      error: (err) => {
        this.submitting = false;
        this.error = err?.error?.message || 'Erreur lors de l\'enregistrement de votre avis.';
        this.cdr.detectChanges();
      }
    });
  }

  close(): void {
    this.promptService.closePrompt();
  }

  goToProduct(slug: string): void {
    this.close();
    this.router.navigate(['/products', slug]);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
