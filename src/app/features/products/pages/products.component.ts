import { Component, OnInit, OnDestroy, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule, NgTemplateOutlet } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { ProductService } from '../../../core/services/product.service';
import { CategoryService } from '../../../core/services/category.service';
import { AuthService } from '../../../core/services/auth.service';
import { CartService } from '../../../core/services/cart.service';
import { AuthPromptService } from '../../../core/services/auth-prompt.service';
import { ProductResponse, GetProductsParams, SortOption } from '../../../core/models/product.models';
import { CategoryResponse } from '../../../core/models/category.models';
import { PageResponse } from '../../../core/models/common.models';
import { TooltipDirective } from '../../../shared/directives/tooltip.directive';
import { MediaUrlPipe } from '../../../shared/pipes/media-url.pipe';
import { ScrollLockService } from '../../../core/services/scroll-lock.service';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, NgTemplateOutlet, FormsModule, ReactiveFormsModule, RouterLink, TooltipDirective, MediaUrlPipe],
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.css'],
})
export class ProductsComponent implements OnInit, OnDestroy {
  products: ProductResponse[] = [];
  categories: CategoryResponse[] = [];
  loading = false;
  error: string | null = null;
  currentPage = 0;
  pageSize = 48;
  totalPages = 0;
  searchQuery = '';

  private readonly searchSubject = new Subject<string>();
  private readonly destroy$ = new Subject<void>();

  // Modal state
  showModal = false;
  editingProduct: ProductResponse | null = null;
  modalLoading = false;
  modalError: string | null = null;
  modalSuccess: string | null = null;
  productForm!: FormGroup;

  // Category filter
  selectedCategoryId: number | null = null;
  private pendingCategorySlug: string | null = null;

  // Sort & price filter
  sortOption: SortOption = 'newest';
  minPriceInput: string = '';
  maxPriceInput: string = '';
  showFilters = false;

  // Tracks product ids that were just added (for button feedback)
  addedIds = new Set<number>();

  // Product quick-view panel
  selectedProduct: ProductResponse | null = null;
  selectedProductQty = 1;
  viewGallery: { url: string; type: 'IMAGE' | 'VIDEO' }[] = [];
  viewGalleryIndex = 0;

  totalItems = 0;


  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.selectedProduct) this.closeProductView();
  }

  get viewActiveItem(): { url: string; type: 'IMAGE' | 'VIDEO' } {
    return this.viewGallery[this.viewGalleryIndex] ?? { url: '', type: 'IMAGE' };
  }

  prevViewImage(): void {
    this.viewGalleryIndex = (this.viewGalleryIndex - 1 + this.viewGallery.length) % this.viewGallery.length;
    this.cdr.detectChanges();
  }

  nextViewImage(): void {
    this.viewGalleryIndex = (this.viewGalleryIndex + 1) % this.viewGallery.length;
    this.cdr.detectChanges();
  }

  setViewImage(i: number): void {
    this.viewGalleryIndex = i;
    this.cdr.detectChanges();
  }

  // Image upload state — création : multi-images ; édition : image unique
  selectedImages: File[] = [];
  imagePreviews: string[] = [];
  selectedVideo: File | null = null;
  videoPreview: string | null = null;
  imagePreview: string | null = null;
  selectedImageFile: File | null = null;
  uploadError: string | null = null;
  dragOver = false;

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private authService: AuthService,
    private cartService: CartService,
    private authPromptService: AuthPromptService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private scrollLock: ScrollLockService
  ) {}

  openProductView(product: ProductResponse): void {
    this.selectedProduct = product;
    this.selectedProductQty = 1;
    this.viewGalleryIndex = 0;
    this._buildViewGallery(product);
    this.scrollLock.lock();
    this.cdr.detectChanges();
    setTimeout(() => document.getElementById('product-view-panel')?.scrollTo(0, 0), 0);
  }

  private _buildViewGallery(product: ProductResponse): void {
    if (product.media?.length) {
      this.viewGallery = product.media.map(m => ({ url: m.url, type: m.mediaType }));
      if (product.imageUrl && !this.viewGallery.some(i => i.url === product.imageUrl)) {
        this.viewGallery.unshift({ url: product.imageUrl, type: 'IMAGE' });
      }
      return;
    }
    this.viewGallery = [{ url: product.imageUrl, type: 'IMAGE' as const }];
  }

  closeProductView(): void {
    this.selectedProduct = null;
    this.scrollLock.unlock();
    this.cdr.detectChanges();
  }

  addToCartFromView(): void {
    if (!this.selectedProduct) return;
    if (!this.authService.isAuthenticated()) {
      this.authPromptService.show();
      return;
    }
    for (let i = 0; i < this.selectedProductQty; i++) {
      this.cartService.addToCart({
        productId: this.selectedProduct.id,
        productName: this.selectedProduct.name,
        price: this.selectedProduct.price,
        quantity: 1,
        imageUrl: this.selectedProduct.imageUrl,
      });
    }
    this.addedIds.add(this.selectedProduct.id);
    this.cdr.detectChanges();
    setTimeout(() => {
      if (this.selectedProduct) this.addedIds.delete(this.selectedProduct.id);
      this.cdr.detectChanges();
    }, 1500);
  }

  addToCart(product: ProductResponse): void {
    if (!this.authService.isAuthenticated()) {
      this.authPromptService.show();
      return;
    }
    this.cartService.addToCart({
      productId: product.id,
      productName: product.name,
      price: product.price,
      quantity: 1,
      imageUrl: product.imageUrl,
    });
    this.addedIds.add(product.id);
    this.cdr.detectChanges();
    setTimeout(() => {
      this.addedIds.delete(product.id);
      this.cdr.detectChanges();
    }, 1500);
  }

  ngOnInit(): void {
    this.initForm();
    const slugParam   = this.route.snapshot.queryParamMap.get('categorie');
    const searchParam = this.route.snapshot.queryParamMap.get('search');
    if (slugParam) {
      this.pendingCategorySlug = slugParam;
      this.loading = true;
    } else if (searchParam) {
      this.searchQuery = searchParam;
      this.loadProducts();
    } else {
      this.loadProducts();
    }
    this.loadCategories();
    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => this.loadProducts(0));
  }

  ngOnDestroy(): void {
    this.scrollLock.forceUnlock();
    this.destroy$.next();
    this.destroy$.complete();
  }

  get isManager(): boolean {
    const user = this.authService.getCurrentUser();
    return user?.role === 'ADMIN' || user?.role === 'MANAGER';
  }

  isNew(product: ProductResponse): boolean {
    if (!product.createdAt) return false;
    const diffMs = Date.now() - new Date(product.createdAt).getTime();
    return diffMs / (1000 * 60 * 60 * 24) <= 7;
  }

  // ─── Product form ───────────────────────────────────────────────────────────

  private initForm(product?: ProductResponse): void {
    this.productForm = this.fb.group({
      name:        [product?.name        ?? '', Validators.required],
      description: [product?.description ?? '', Validators.required],
      price:       [product?.price       ?? null, [Validators.required, Validators.min(1)]],
      stock:       [product?.stock       ?? null, [Validators.required, Validators.min(0)]],
      categoryId:  [product?.category?.id ?? null, Validators.required],
    });
  }

  openCreateModal(): void {
    this.editingProduct = null;
    this.modalError = null;
    this.modalSuccess = null;
    this.selectedImages = [];
    this.imagePreviews = [];
    this.selectedVideo = null;
    this.videoPreview = null;
    this.imagePreview = null;
    this.selectedImageFile = null;
    this.uploadError = null;
    this.initForm();
    this.showModal = true;
    this.scrollLock.lock();
    this.cdr.detectChanges();
  }

  openEditModal(product: ProductResponse): void {
    this.editingProduct = product;
    this.modalError = null;
    this.modalSuccess = null;
    this.selectedImages = [];
    this.imagePreviews = [];
    this.selectedVideo = null;
    this.videoPreview = null;
    this.imagePreview = product.imageUrl || null;
    this.selectedImageFile = null;
    this.uploadError = null;
    this.initForm(product);
    this.showModal = true;
    this.scrollLock.lock();
    this.cdr.detectChanges();
  }

  closeModal(): void {
    this.showModal = false;
    this.scrollLock.unlock();
    this.editingProduct = null;
    this.modalError = null;
    this.modalSuccess = null;
    this.selectedImages = [];
    this.imagePreviews = [];
    this.selectedVideo = null;
    this.videoPreview = null;
    this.imagePreview = null;
    this.selectedImageFile = null;
    this.uploadError = null;
    this.cdr.detectChanges();
  }

  // ─── Image upload ────────────────────────────────────────────────────────────

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = false;
    const files = event.dataTransfer?.files;
    if (files) Array.from(files).forEach(f => this._uploadFile(f));
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = true;
    this.cdr.detectChanges();
  }

  onDragLeave(): void {
    this.dragOver = false;
    this.cdr.detectChanges();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) Array.from(input.files).forEach(f => this._uploadFile(f));
    input.value = '';
  }

  onVideoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this._uploadFile(file);
    input.value = '';
  }

  private _isImageFile(file: File): boolean {
    if (file.type.startsWith('image/')) return true;
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    return ['heic', 'heif'].includes(ext);
  }

  private _isVideoFile(file: File): boolean {
    return file.type.startsWith('video/');
  }

  private _uploadFile(file: File): void {
    if (this._isVideoFile(file)) {
      if (file.size > 50 * 1024 * 1024) { this.uploadError = 'Vidéo trop lourde — max 50 Mo'; this.cdr.detectChanges(); return; }
      this.selectedVideo = file;
      this.uploadError = null;
      const reader = new FileReader();
      reader.onload = (e) => { this.videoPreview = e.target?.result as string; this.cdr.detectChanges(); };
      reader.readAsDataURL(file);
      return;
    }
    if (!this._isImageFile(file)) {
      this.uploadError = 'Format non supporté — JPEG, PNG, WEBP, GIF, BMP, TIFF, SVG, AVIF, HEIC';
      this.cdr.detectChanges();
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      this.uploadError = 'Image trop lourde — maximum 20 Mo';
      this.cdr.detectChanges();
      return;
    }

    if (this.editingProduct) {
      this.selectedImageFile = file;
      this.uploadError = null;
      const reader = new FileReader();
      reader.onload = (e) => { this.imagePreview = e.target?.result as string; this.cdr.detectChanges(); };
      reader.readAsDataURL(file);
    } else {
      if (this.selectedImages.length >= 4) { this.uploadError = 'Maximum 4 images autorisées'; this.cdr.detectChanges(); return; }
      this.uploadError = null;
      const reader = new FileReader();
      reader.onload = (e) => {
        this.selectedImages = [...this.selectedImages, file];
        this.imagePreviews = [...this.imagePreviews, e.target?.result as string];
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage(index: number): void {
    this.selectedImages = this.selectedImages.filter((_, i) => i !== index);
    this.imagePreviews = this.imagePreviews.filter((_, i) => i !== index);
    this.cdr.detectChanges();
  }

  removeVideo(): void { this.selectedVideo = null; this.videoPreview = null; this.cdr.detectChanges(); }

  clearImage(): void {
    this.imagePreview = null;
    this.selectedImageFile = null;
    this.uploadError = null;
    this.cdr.detectChanges();
  }

  saveProduct(): void {
    if (this.productForm.invalid) return;
    this.modalLoading = true;
    this.modalError = null;

    const v = this.productForm.value;
    const fd = new FormData();
    fd.append('name', v.name);
    if (v.description) fd.append('description', v.description);
    fd.append('price', v.price.toString());
    fd.append('stock', v.stock.toString());
    if (v.categoryId) fd.append('categoryId', v.categoryId.toString());

    let request$;
    if (this.editingProduct) {
      if (this.selectedImageFile) fd.append('mainImage', this.selectedImageFile);
      if (this.selectedVideo) fd.append('video', this.selectedVideo);
      request$ = this.productService.updateProduct(this.editingProduct.id, fd);
    } else {
      for (const img of this.selectedImages) fd.append('images', img);
      if (this.selectedVideo) fd.append('video', this.selectedVideo);
      request$ = this.productService.createProduct(fd);
    }

    request$.subscribe({
      next: (response) => {
        if (response.success) {
          this.modalSuccess = this.editingProduct
            ? 'Article mis à jour avec succès'
            : 'Article ajouté avec succès';
          this.loadProducts(this.currentPage);
          setTimeout(() => this.closeModal(), 1200);
        } else {
          this.modalError = 'Une erreur est survenue';
        }
        this.modalLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.modalError = 'Erreur lors de la sauvegarde';
        this.modalLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  deleteProduct(product: ProductResponse): void {
    if (!confirm(`Supprimer "${product.name}" ?`)) return;

    this.productService.deleteProduct(product.id).subscribe({
      next: (response) => {
        if (response.success) {
          this.loadProducts(this.currentPage);
        }
        this.cdr.detectChanges();
      },
      error: () => this.cdr.detectChanges(),
    });
  }

  // ─── Catalogue ──────────────────────────────────────────────────────────────

  loadProducts(page: number = 0): void {
    this.loading = true;
    this.error = null;

    const params: GetProductsParams = { page, size: this.pageSize };
    if (this.searchQuery) params.search = this.searchQuery;
    if (this.selectedCategoryId) params.categoryId = this.selectedCategoryId;
    if (this.sortOption !== 'newest') params.sort = this.sortOption;
    const min = parseFloat(this.minPriceInput);
    const max = parseFloat(this.maxPriceInput);
    if (!isNaN(min) && min > 0) params.minPrice = min;
    if (!isNaN(max) && max > 0) params.maxPrice = max;

    this.productService.getProducts(params).subscribe({
      next: (response) => {
        if (response.success) {
          const pageResponse = response.data as PageResponse<ProductResponse>;
          this.products = pageResponse.content;
          this.totalPages = pageResponse.totalPages;
          this.totalItems = pageResponse.totalElements;
          this.currentPage = page;
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.products = [];
        this.totalPages = 0;
        this.currentPage = 0;
        this.error = 'Impossible de charger les produits. Veuillez réessayer.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private loadCategories(): void {
    this.categoryService.getCategories().subscribe({
      next: (response) => {
        if (response.success && Array.isArray(response.data)) {
          this.categories = response.data;
          if (this.pendingCategorySlug) {
            const slug = this.pendingCategorySlug.toLowerCase();
            const cat = this.categories.find(c => c.slug.toLowerCase().includes(slug));
            if (cat) this.selectedCategoryId = cat.id;
            this.pendingCategorySlug = null;
            this.loadProducts(0);
          }
        } else if (this.pendingCategorySlug) {
          // catégories indisponibles — charger sans filtre quand même
          this.pendingCategorySlug = null;
          this.loadProducts(0);
        }
        this.cdr.detectChanges();
      },
      error: () => {
        if (this.pendingCategorySlug) {
          this.pendingCategorySlug = null;
          this.loadProducts(0);
        }
        this.cdr.detectChanges();
      },
    });
  }

  onSearchChange(value: string): void {
    this.searchQuery = value;
    this.searchSubject.next(value);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchSubject.next('');
  }

  selectCategory(id: number | null): void {
    this.selectedCategoryId = id;
    this.searchQuery = '';
    this.loadProducts(0);
  }

  get productsByCategory(): { category: CategoryResponse; items: ProductResponse[] }[] {
    const map = new Map<number, { category: CategoryResponse; items: ProductResponse[] }>();
    for (const p of this.products) {
      if (!map.has(p.category.id)) map.set(p.category.id, { category: p.category, items: [] });
      map.get(p.category.id)!.items.push(p);
    }
    return Array.from(map.values());
  }

  search(): void { this.loadProducts(0); }

  onSortChange(sort: string): void {
    this.sortOption = sort as SortOption;
    this.loadProducts(0);
  }

  applyPriceFilter(): void {
    this.loadProducts(0);
  }

  clearFilters(): void {
    this.sortOption = 'newest';
    this.minPriceInput = '';
    this.maxPriceInput = '';
    this.loadProducts(0);
    this.cdr.detectChanges();
  }

  get hasActiveFilters(): boolean {
    return this.sortOption !== 'newest' || !!this.minPriceInput || !!this.maxPriceInput;
  }

  previousPage(): void {
    if (this.currentPage > 0) this.loadProducts(this.currentPage - 1);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) this.loadProducts(this.currentPage + 1);
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i);
  }

  get selectedCategoryName(): string | null {
    if (this.selectedCategoryId === null) return null;
    return this.categories.find(c => c.id === this.selectedCategoryId)?.name ?? null;
  }
}
