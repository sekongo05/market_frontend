import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProductSummaryResponse } from '../../../core/models/product.models';
import { MediaUrlPipe } from '../../pipes/media-url.pipe';
import { TooltipDirective } from '../../directives/tooltip.directive';

const NEW_PRODUCT_DAYS = 14;

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, RouterLink, MediaUrlPipe, TooltipDirective],
  templateUrl: './product-card.component.html',
  styleUrls: ['./product-card.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCardComponent {
  @Input({ required: true }) product!: ProductSummaryResponse;
  @Input() index = 0;
  @Input() priorityImage = false;
  @Input() isManager = false;
  @Input() inCart = false;
  @Input() isFavorite = false;
  @Input() showQuickView = true;
  @Input() sizes = '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw';

  @Output() quickView = new EventEmitter<ProductSummaryResponse>();
  @Output() quickAdd = new EventEmitter<ProductSummaryResponse>();
  @Output() toggleFavorite = new EventEmitter<ProductSummaryResponse>();
  @Output() edit = new EventEmitter<ProductSummaryResponse>();
  @Output() delete = new EventEmitter<ProductSummaryResponse>();

  get displayImage(): string {
    return this.product.listImageUrl || this.product.imageUrl;
  }

  get hasDiscount(): boolean {
    return Boolean(this.product.discountPercent && this.product.discountPercent > 0 && this.product.salePrice);
  }

  get isOutOfStock(): boolean {
    return this.product.stock <= 0;
  }

  get isLowStock(): boolean {
    return this.product.stock > 0 && this.product.stock <= 5;
  }

  get isNewProduct(): boolean {
    if (!this.product.createdAt) return false;
    const diffDays = (Date.now() - new Date(this.product.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= NEW_PRODUCT_DAYS;
  }

  onQuickView(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.quickView.emit(this.product);
  }

  onQuickAdd(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.isOutOfStock) return;
    this.quickAdd.emit(this.product);
  }

  onToggleFavorite(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.toggleFavorite.emit(this.product);
  }

  onEdit(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.edit.emit(this.product);
  }

  onDelete(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.delete.emit(this.product);
  }
}

