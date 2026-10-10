import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil, tap } from 'rxjs/operators';
import { SEARCH_DEBOUNCE } from '../../../../core/constants';
import { MediaUrlPipe } from '../../../../shared/pipes/media-url.pipe';
import { ProductService } from '../../../../core/services/product.service';
import { CategoryService } from '../../../../core/services/category.service';
import { ProductMediaService } from '../../../../core/services/product-media.service';
import { ProductVariantService, ProductVariantRequest } from '../../../../core/services/product-variant.service';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { ScrollLockService } from '../../../../core/services/scroll-lock.service';
import { ManagerToastService } from '../../shared/manager-toast.service';
import { ProductResponse, ProductSummaryResponse, GetProductsParams, ProductMediaItem, ProductVariant, Gender, ProductAttributeResponse } from '../../../../core/models/product.models';
import { CategoryResponse } from '../../../../core/models/category.models';
import { PageResponse } from '../../../../core/models/common.models';
import { compressImage } from '../../../../core/utils/image-compression.util';

@Component({
  selector: 'app-manager-products',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, FormsModule, ReactiveFormsModule, MediaUrlPipe],
  templateUrl: './manager-products.component.html',
})
export class ManagerProductsComponent implements OnInit, OnDestroy {

  // ── Data ──────────────────────────────────────────────────────────────────
  products: ProductSummaryResponse[] = [];
  categories: CategoryResponse[] = [];
  loading = false;
  currentPage = 0;
  readonly pageSize = 10;
  totalPages = 0;
  searchQuery = '';

  // ── Stats ─────────────────────────────────────────────────────────────────
  totalProducts = 0;
  lowStockCount = 0;
  outOfStockCount = 0;

  // ── Drawer ────────────────────────────────────────────────────────────────
  drawerOpen = false;
  editingProduct: ProductResponse | null = null;
  drawerLoading = false;
  drawerError: string | null = null;
  productForm!: FormGroup;

  // ── Wizard création ───────────────────────────────────────────────────────
  wizardStep: 1 | 2 | 3 = 1;
  hasVariantsToggle = false;
  creationItems: { file: File; preview: string; variantName: string; colorHex: string; stock: number; attributeValueTempIds?: string[] }[] = [];
  pendingCreationFile: File | null = null;
  pendingCreationPreview: string | null = null;
  pendingCreationColor = { variantName: '', colorHex: '#000000', stock: 0 };
  pendingCreationColorError: string | null = null;

  // ── Image & vidéo ─────────────────────────────────────────────────────────
  selectedVideo: File | null = null;
  videoPreview: string | null = null;
  imagePreview: string | null = null;
  selectedImageFile: File | null = null;
  uploadError: string | null = null;

  // ── Drawer tabs & media ───────────────────────────────────────────────────
  drawerTab: 'info' | 'media' | 'variants' = 'info';
  productMedia: ProductMediaItem[] = [];
  mediaLoading = false;
  mediaUploading = false;
  pendingMediaFile: File | null = null;
  pendingMediaPreview: string | null = null;
  pendingMediaColor = { variantName: '', colorHex: '#000000', stock: 0 };
  mediaColorError: string | null = null;
  productVariants: ProductVariant[] = [];
  variantsLoading = false;
  variantSaving = false;
  variantError: string | null = null;
  newVariant: ProductVariantRequest = { variantName: '', colorHex: '#000000', imageUrl: '', stock: 0 };
  editingVariant: ProductVariant | null = null;
  newVariantFile: File | null = null;
  newVariantPreview: string | null = null;
  variantFormAttributes: Record<string, string> = {};
  variantAttributeValueIds: number[] = [];

  // ── Attributs du produit ──────────────────────────────────────────────
  productAttributes: ProductAttributeResponse[] = [];
  attributesLoading = false;
  attributeSaving = false;
  attributeError: string | null = null;
  addAttributeOpen = false;
  newAttributeName = '';
  editingAttribute: ProductAttributeResponse | null = null;
  newValueInputs: { value: string; colorHex: string }[] = [];

  // ── Attributs temporaires (création) ──────────────────────────────────
  tempAttributes: { tempId: string; name: string; realId?: number; values: { tempId: string; value: string; colorHex?: string; realId?: number }[] }[] = [];
  selectedCreationAttrValueIds: string[] = [];
  editingTempAttr: { tempId: string; name: string; values: { tempId: string; value: string; colorHex?: string }[] } | null = null;

  get attributesAvailableValues(): Record<string, { value: string; count: number }[]> {
    const result: Record<string, { value: string; count: number }[]> = {};
    for (const attr of this.productAttributes) {
      result[attr.name] = attr.values.map(v => ({
        value: v.value,
        count: this.productVariants.filter(vr =>
          vr.attributeValues?.some(av => av.id === v.id)
        ).length,
      }));
    }
    return result;
  }

  generateVariantName(): string {
    const vals = Object.values(this.variantFormAttributes).filter(Boolean);
    return vals.join(' / ') || '';
  }

  // ── Inline edits ──────────────────────────────────────────────────────────
  editingStockId: number | null = null;
  editingStockValue = 0;
  stockSavingId: number | null = null;
  discountEditingId: number | null = null;
  discountEditValue = 0;
  discountSavingId: number | null = null;
  confirmDeleteId: number | null = null;

  readonly genders: { value: Gender; label: string }[] = [
    { value: 'HOMME',  label: 'Homme'   },
    { value: 'FEMME',  label: 'Femme'   },
    { value: 'UNISEX', label: 'Unisexe' },
  ];

  private readonly COLOR_MAP: Record<string, string> = {
    // Couleurs basiques
    'noir': '#000000', 'black': '#000000',
    'blanc': '#FFFFFF', 'white': '#FFFFFF',
    'rouge': '#FF0000', 'red': '#FF0000',
    'bleu': '#0000FF', 'blue': '#0000FF',
    'vert': '#008000', 'green': '#008000',
    'jaune': '#FFD700', 'yellow': '#FFD700',
    'orange': '#FF8C00',
    'rose': '#FF69B4', 'pink': '#FF69B4',
    'violet': '#800080', 'purple': '#800080',
    'gris': '#808080', 'grey': '#808080', 'gray': '#808080',
    'marron': '#8B4513', 'brun': '#5C4033', 'brown': '#8B4513',
    'beige': '#F5F5DC',
    // Bijouterie, métaux & horlogerie
    'or': '#FFD700', 'gold': '#FFD700', 'dore': '#FFD700', 'doré': '#FFD700',
    'or rose': '#B76E79', 'rose gold': '#B76E79',
    'or jaune': '#FFD700',
    'or blanc': '#F4F4F4',
    'argent': '#C0C0C0', 'silver': '#C0C0C0', 'argente': '#C0C0C0', 'argenté': '#C0C0C0',
    'acier': '#B0C4DE', 'acier inoxydable': '#B0C4DE',
    'platine': '#E5E4E2',
    'bronze': '#CD7F32',
    'cuivre': '#B87333',
    // Nuances de mode
    'bleu marine': '#001F3F', 'marine': '#001F3F', 'navy': '#001F3F',
    'bleu ciel': '#87CEEB',
    'bleu nuit': '#191970',
    'bleu roi': '#4169E1',
    'bordeaux': '#800020', 'burgundy': '#800020',
    'kaki': '#556B2F', 'khaki': '#556B2F',
    'turquoise': '#40E0D0',
    'vert olive': '#808000', 'olive': '#808000',
    'vert emeraude': '#50C878', 'emeraude': '#50C878', 'vert émeraude': '#50C878', 'émeraude': '#50C878',
    'anthracite': '#303030',
    'taupe': '#483C32',
    'cognac': '#9A463D',
    'caramel': '#C68E17',
    'moutarde': '#E1AD01',
    'corail': '#FF7F50', 'coral': '#FF7F50',
    'lilas': '#C8A2C8',
    'lavande': '#E6E6FA',
    'fuchsia': '#FF00FF',
    'creme': '#FFFDD0', 'crème': '#FFFDD0', 'ivoire': '#FFFFF0', 'ivory': '#FFFFF0',
    'menthe': '#98FF98',
  };


  private readonly searchSubject = new Subject<string>();
  private readonly destroy$ = new Subject<void>();

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private productMediaService: ProductMediaService,
    private productVariantService: ProductVariantService,
    private wsService: WebSocketService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private scrollLock: ScrollLockService,
    private toast: ManagerToastService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.drawerOpen) this.closeDrawer();
    else if (this.editingStockId !== null) this.cancelEditStock();
    else if (this.discountEditingId !== null) this.cancelEditDiscount();
    else if (this.confirmDeleteId !== null) this.cancelDelete();
  }

  ngOnInit(): void {
    this.initForm();
    this.loadProducts();
    this.loadCategories();
    this.searchSubject.pipe(
      debounceTime(SEARCH_DEBOUNCE),
      distinctUntilChanged(),
      tap(query => this.searchQuery = query),
      takeUntil(this.destroy$)
    ).subscribe(() => this.loadProducts(0));

    this.wsService.staffEvent$.pipe(takeUntil(this.destroy$)).subscribe(event => {
      if (event.module === 'products')   this.loadProducts(0);
      if (event.module === 'categories') this.loadCategories();
      this.cdr.markForCheck();
    });

    this.wsService.stockUpdate$.pipe(takeUntil(this.destroy$)).subscribe(update => {
      const idx = this.products.findIndex(p => p.id === update.productId);
      if (idx !== -1) {
        this.products = [...this.products];
        this.products[idx] = { ...this.products[idx], stock: update.stock };
        this._computeStats();
        this.cdr.markForCheck();
      }
      if (this.editingProduct?.id === update.productId) {
        this.editingProduct.stock = update.stock;
        if (update.variantId != null && update.variantStock != null && this.productVariants) {
          const v = this.productVariants.find(vr => vr.id === update.variantId);
          if (v) v.stock = update.variantStock;
        }
        this.cdr.markForCheck();
      }
    });

    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const editSlug = params['edit'];
      if (editSlug) {
        this.openEditDrawer({ slug: editSlug } as ProductSummaryResponse);
      }
    });
  }

  ngOnDestroy(): void {
    this.scrollLock.forceUnlock();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  private _computeStats(): void {
    this.totalProducts   = this.products.length;
    this.outOfStockCount = this.products.filter(p => p.stock === 0).length;
    this.lowStockCount   = this.products.filter(p => p.stock > 0 && p.stock <= 3).length;
  }

  stockClass(stock: number): string {
    if (stock === 0) return 'text-red-400 bg-red-500/10';
    if (stock <= 3)  return 'text-orange-400 bg-orange-500/10';
    return 'text-green-400 bg-green-500/10';
  }

  stockLabel(stock: number): string {
    if (stock === 0) return 'Épuisé';
    if (stock <= 3)  return `${stock} restant${stock > 1 ? 's' : ''}`;
    return `${stock} en stock`;
  }

  // ── Products CRUD ──────────────────────────────────────────────────────────

  loadProducts(page = 0): void {
    this.loading = true;
    const params: GetProductsParams = { page, size: this.pageSize };
    if (this.searchQuery) params.search = this.searchQuery;
    this.productService.getProducts(params).subscribe({
      next: (r) => {
        if (r.success) {
          const pg = r.data as PageResponse<ProductSummaryResponse>;
          this.products   = pg.content;
          this.totalPages = pg.totalPages;
        } else {
          this.products = []; this.totalPages = 1;
        }
        this.currentPage = page;
        this._computeStats();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.products = []; this.totalPages = 1; this.currentPage = 0;
        this._computeStats(); this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  private loadCategories(): void {
    this.categoryService.getCategories().subscribe({
      next: (r) => {
        this.categories = (r.success && Array.isArray(r.data)) ? r.data : [];
        this.cdr.markForCheck();
      },
      error: () => { this.categories = []; this.cdr.markForCheck(); },
    });
  }

  onSearchChange(value: string): void { this.searchSubject.next(value); }
  clearSearch(): void { this.searchSubject.next(''); }
  search(): void { this.loadProducts(0); }
  previousPage(): void { if (this.currentPage > 0) this.loadProducts(this.currentPage - 1); }
  nextPage(): void { if (this.currentPage < this.totalPages - 1) this.loadProducts(this.currentPage + 1); }
  get pages(): number[] { return Array.from({ length: this.totalPages }, (_, i) => i); }

  // ── Inline stock ──────────────────────────────────────────────────────────

  startEditStock(product: ProductSummaryResponse): void {
    this.confirmDeleteId = null;
    this.editingStockId = product.id;
    this.editingStockValue = product.stock;
    this.cdr.markForCheck();
  }

  adjustStock(delta: number): void {
    this.editingStockValue = Math.max(0, (this.editingStockValue || 0) + delta);
    this.cdr.markForCheck();
  }

  confirmEditStock(product: ProductSummaryResponse): void {
    const newStock = Math.max(0, Math.round(+this.editingStockValue || 0));
    this.editingStockId = null;
    if (newStock === product.stock) { this.cdr.markForCheck(); return; }
    this.stockSavingId = product.id;
    const fd = new FormData();
    fd.append('name', product.name);
    fd.append('price', product.price.toString());
    fd.append('stock', newStock.toString());
    fd.append('gender', product.gender);
    const applyLocally = () => {
      const idx = this.products.findIndex(p => p.id === product.id);
      if (idx !== -1) { this.products = [...this.products]; this.products[idx] = { ...this.products[idx], stock: newStock }; this._computeStats(); }
      this.toast.show(`Stock mis à jour : ${newStock}`);
      this.stockSavingId = null;
      this.cdr.markForCheck();
    };
    this.productService.updateProduct(product.id, fd).subscribe({ next: applyLocally, error: applyLocally });
  }

  cancelEditStock(): void { this.editingStockId = null; this.cdr.markForCheck(); }

  // ── Inline discount ───────────────────────────────────────────────────────

  startEditDiscount(product: ProductSummaryResponse): void {
    this.editingStockId = null;
    this.confirmDeleteId = null;
    this.discountEditingId = product.id;
    this.discountEditValue = product.discountPercent ?? 0;
    this.cdr.markForCheck();
  }

  confirmEditDiscount(product: ProductSummaryResponse): void {
    const pct = Math.max(0, Math.min(100, Math.round(+this.discountEditValue || 0)));
    this.discountEditingId = null;
    if ((product.discountPercent ?? 0) === pct) { this.cdr.markForCheck(); return; }
    this.discountSavingId = product.id;
    const apply = (updated?: ProductResponse) => {
      const idx = this.products.findIndex(p => p.id === product.id);
      if (idx !== -1) {
        this.products = [...this.products];
        const dp = pct > 0 ? pct : undefined;
        const sp = pct > 0 ? Math.round(product.price * (1 - pct / 100)) : undefined;
        this.products[idx] = updated
          ? { ...this.products[idx], discountPercent: updated.discountPercent, salePrice: updated.salePrice }
          : { ...this.products[idx], discountPercent: dp, salePrice: sp };
      }
      this.toast.show(pct > 0 ? `Remise ${pct}% appliquée` : 'Remise supprimée');
      this.discountSavingId = null;
      this.cdr.markForCheck();
    };
    this.productService.setDiscount(product.id, pct > 0 ? pct : null).subscribe({
      next: (r) => apply(r.data ?? undefined),
      error: () => apply(),
    });
  }

  cancelEditDiscount(): void { this.discountEditingId = null; this.cdr.markForCheck(); }

  // ── Inline delete ─────────────────────────────────────────────────────────

  startDelete(id: number): void { this.editingStockId = null; this.confirmDeleteId = id; this.cdr.markForCheck(); }

  doDelete(product: ProductSummaryResponse): void {
    this.confirmDeleteId = null;
    this.productService.deleteProduct(product.id).subscribe({
      next: () => { this.loadProducts(this.currentPage); this.toast.show(`"${product.name}" supprimé`); },
      error: (err) => { this.toast.show(err?.error?.message || err?.message || 'Erreur de suppression', 'error'); this.cdr.markForCheck(); },
    });
  }

  cancelDelete(): void { this.confirmDeleteId = null; this.cdr.markForCheck(); }

  // ── Drawer ────────────────────────────────────────────────────────────────

  private initForm(product?: ProductResponse): void {
    this.productForm = this.fb.group({
      name:        [product?.name          ?? '', Validators.required],
      description: [product?.description   ?? '', Validators.required],
      price:       [product?.price         ?? null, [Validators.required, Validators.min(1)]],
      stock:       [product?.stock         ?? null, [Validators.required, Validators.min(0)]],
      gender:      [product?.gender        ?? 'UNISEX', Validators.required],
      categoryId:  [product?.category?.id ?? null, Validators.required],
    });
  }

  get isStep1Valid(): boolean {
    const f = this.productForm;
    if (this.hasVariantsToggle) {
      return !!(f.get('name')?.valid && f.get('description')?.valid && f.get('categoryId')?.value && f.get('gender')?.value);
    }
    return !!(f.get('name')?.valid && f.get('description')?.valid && f.get('categoryId')?.value && f.get('gender')?.value && f.get('stock')?.valid);
  }

  get creationTotalStock(): number { return this.creationItems.reduce((s, i) => s + i.stock, 0); }

  goToNextStep(): void {
    if (this.wizardStep === 1) {
      ['name', 'description', 'categoryId', 'gender'].forEach(f => this.productForm.get(f)?.markAsTouched());
      if (!this.isStep1Valid) { this.cdr.markForCheck(); return; }
    }
    if (this.wizardStep < 3) {
      this.wizardStep = (this.wizardStep + 1) as 1 | 2 | 3;
      document.getElementById('manager-drawer-body')?.scrollTo(0, 0);
      this.cdr.markForCheck();
    }
  }

  goToPrevStep(): void {
    if (this.wizardStep > 1) {
      this.wizardStep = (this.wizardStep - 1) as 1 | 2 | 3;
      document.getElementById('manager-drawer-body')?.scrollTo(0, 0);
      this.cdr.markForCheck();
    }
  }

  onCategoryChange(): void {
    if (this.editingProduct) return;
    this.wizardStep = 1;
    this.hasVariantsToggle = false;
    this.creationItems = [];
    this.pendingCreationFile = null;
    this.pendingCreationPreview = null;
    this.pendingCreationColorError = null;
    this.cdr.markForCheck();
  }

  toggleVariants(): void {
    this.hasVariantsToggle = !this.hasVariantsToggle;
    this.creationItems = [];
    this.pendingCreationFile = null;
    this.pendingCreationPreview = null;
    this.pendingCreationColorError = null;
    this.tempAttributes = [];
    this.selectedCreationAttrValueIds = [];
    this.editingTempAttr = null;
    if (!this.hasVariantsToggle) this.productForm.patchValue({ stock: null });
    this.cdr.markForCheck();
  }

  openCreateDrawer(): void {
    this.editingProduct = null;
    this.drawerError = null;
    this.wizardStep = 1;
    this.hasVariantsToggle = false;
    this.creationItems = [];
    this.pendingCreationFile = null;
    this.pendingCreationPreview = null;
    this.tempAttributes = [];
    this.selectedCreationAttrValueIds = [];
    this.editingTempAttr = null;
    this.pendingCreationColorError = null;
    this.pendingCreationColor = { variantName: '', colorHex: '#000000', stock: 0 };
    this.selectedVideo = null; this.videoPreview = null;
    this.imagePreview = null; this.selectedImageFile = null;
    this.uploadError = null;
    this.drawerTab = 'info'; this.productMedia = [];
    this.initForm();
    this.drawerOpen = true;
    this.scrollLock.lock();
    this.cdr.markForCheck();
    setTimeout(() => document.getElementById('manager-drawer-body')?.scrollTo(0, 0), 0);
  }

  openEditDrawer(product: ProductSummaryResponse): void {
    this.drawerLoading = true;
    this.productService.getProductBySlug(product.slug).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        if (r.success && r.data) {
          this.editingProduct = r.data;
          this.drawerError = null;
          this.creationItems = []; this.pendingCreationFile = null; this.pendingCreationPreview = null; this.pendingCreationColorError = null;
          this.selectedVideo = null; this.videoPreview = null;
          this.imagePreview = r.data.imageUrl || null;
          this.selectedImageFile = null; this.uploadError = null;
          this.drawerTab = 'info';
          this.productMedia = r.data.media ?? [];
          this.productVariants = r.data.variants ?? [];
          this.productAttributes = r.data.attributes ?? [];
          this.attributesLoading = false; this.attributeSaving = false; this.attributeError = null;
          this.addAttributeOpen = false; this.newAttributeName = ''; this.editingAttribute = null; this.newValueInputs = [];
          this.tempAttributes = []; this.selectedCreationAttrValueIds = []; this.editingTempAttr = null;
          this.variantError = null; this.editingVariant = null;
          this.newVariant = { variantName: '', colorHex: '#000000', imageUrl: '', stock: 0 };
          this.variantFormAttributes = {}; this.variantAttributeValueIds = [];
          this.initForm(r.data);
          this.drawerOpen = true;
          this.scrollLock.lock();
          this.loadMedia(r.data.id);
          this.loadVariants(r.data.id);
          this.loadAttributes(r.data.id);
        }
        this.drawerLoading = false;
        this.cdr.markForCheck();
        setTimeout(() => document.getElementById('manager-drawer-body')?.scrollTo(0, 0), 0);
      },
      error: () => {
        this.drawerLoading = false;
        this.drawerError = 'Impossible de charger le produit';
        this.cdr.markForCheck();
      },
    });
  }

  setDrawerTab(tab: 'info' | 'media' | 'variants'): void {
    this.drawerTab = tab;
    document.getElementById('manager-drawer-body')?.scrollTo(0, 0);
  }

  closeDrawer(): void {
    this.drawerOpen = false;
    this.scrollLock.unlock();
    this.editingProduct = null; this.drawerError = null;
    this.wizardStep = 1; this.hasVariantsToggle = false;
    this.creationItems = []; this.pendingCreationFile = null; this.pendingCreationPreview = null;
    this.pendingCreationColorError = null;
    this.pendingCreationColor = { variantName: '', colorHex: '#000000', stock: 0 };
    this.selectedVideo = null; this.videoPreview = null;
    this.imagePreview = null; this.selectedImageFile = null; this.uploadError = null;
    this.drawerTab = 'info'; this.productMedia = []; this.productVariants = [];
    this.variantError = null; this.editingVariant = null;
    this.newVariant = { variantName: '', colorHex: '#000000', imageUrl: '', stock: 0 };
    this.newVariantFile = null; this.newVariantPreview = null;
    this.pendingMediaFile = null; this.pendingMediaPreview = null; this.mediaColorError = null;
    this.tempAttributes = [];
    this.selectedCreationAttrValueIds = [];
    this.editingTempAttr = null;
    if (this.route.snapshot.queryParams['edit']) {
      this.router.navigate([], { relativeTo: this.route, queryParams: { edit: null }, queryParamsHandling: 'merge', replaceUrl: true });
    }
    this.cdr.markForCheck();
  }

  saveProduct(): void {
    if (this.productForm.invalid) return;
    this.drawerLoading = true;
    this.drawerError = null;

    const v = this.productForm.value;
    const fd = new FormData();
    fd.append('name', v.name);
    if (v.description) fd.append('description', v.description);
    fd.append('price', v.price.toString());
    fd.append('stock', (v.stock ?? 0).toString());
    if (v.gender) fd.append('gender', v.gender);
    if (v.categoryId) fd.append('categoryId', v.categoryId.toString());

    let req$;
    if (this.editingProduct) {
      if (this.selectedImageFile) fd.append('mainImage', this.selectedImageFile);
      if (this.selectedVideo) fd.append('video', this.selectedVideo);
      req$ = this.productService.updateProduct(this.editingProduct.id, fd);
    } else {
      if (this.hasVariantsToggle && this.creationItems.length > 0) fd.append('images', this.creationItems[0].file);
      else if (!this.hasVariantsToggle && this.selectedImageFile) fd.append('images', this.selectedImageFile);
      if (this.selectedVideo) fd.append('video', this.selectedVideo);
      req$ = this.productService.createProduct(fd);
    }

    const wasCreating = !this.editingProduct;
    const itemsSnapshot = [...this.creationItems];
    const wasNoVariant = !this.hasVariantsToggle;
    const tempAttrSnapshot = [...this.tempAttributes];
    const selectedAttrVals = [...this.selectedCreationAttrValueIds];
    req$.subscribe({
      next: (r) => {
        if (r.success) {
          this.loadProducts(this.currentPage);
          if (wasCreating && r.data) {
            const product = r.data;
            this.editingProduct = product;
            this.initForm(product);
            this.drawerTab = 'media';
            if (itemsSnapshot.length === 0 && tempAttrSnapshot.length === 0) {
              this.drawerLoading = false;
              this.productVariants = []; this.productMedia = [];
              this.toast.show('Produit créé avec succès ✓');
              if (wasNoVariant) this.closeDrawer();
              this.cdr.markForCheck();
              return;
            }
            // 1. Sauvegarder les attributs temporaires
            const saveAttrs = (cb: () => void, attrIndex = 0): void => {
              if (attrIndex >= tempAttrSnapshot.length) { cb(); return; }
              const a = tempAttrSnapshot[attrIndex];
              this.productVariantService.addAttribute(product.id, {
                name: a.name,
                values: a.values.map(v => ({ value: v.value, colorHex: v.colorHex })),
              }).subscribe({
                next: (ar) => {
                  if (ar.success && ar.data) {
                    tempAttrSnapshot[attrIndex].realId = ar.data.id;
                    ar.data.values.forEach((av, i) => {
                      if (a.values[i]) a.values[i].realId = av.id;
                    });
                  }
                  saveAttrs(cb, attrIndex + 1);
                },
                error: () => saveAttrs(cb, attrIndex + 1),
              });
            };
            // 2. Sauvegarder les variantes
            const processItem = (index: number) => {
              if (index >= itemsSnapshot.length) {
                this.drawerLoading = false;
                this.creationItems = [];
                this.tempAttributes = [];
                this.selectedCreationAttrValueIds = [];
                this.loadVariants(product.id);
                this.loadMedia(product.id);
                this.loadAttributes(product.id);
                const msg = itemsSnapshot.length > 0
                  ? `Produit créé avec ${itemsSnapshot.length} variante(s) ✓`
                  : 'Produit créé ✓';
                this.toast.show(msg);
                this.cdr.markForCheck();
                return;
              }
              const item = itemsSnapshot[index];
              const variantReq: any = {
                variantName: item.variantName,
                colorHex: item.colorHex || undefined,
                imageUrl: '',
                stock: item.stock,
              };
              if (item.attributeValueTempIds?.length) {
                const realIds = item.attributeValueTempIds
                  .map(tid => tempAttrSnapshot.flatMap(a => a.values).find(v => v.tempId === tid)?.realId)
                  .filter((id): id is number => id != null);
                if (realIds.length) variantReq.attributeValueIds = realIds;
              }
              const createVariant = (imageUrl: string) => {
                variantReq.imageUrl = imageUrl;
                this.productVariantService.addVariant(product.id, variantReq)
                  .subscribe({ next: () => processItem(index + 1), error: () => processItem(index + 1) });
              };
              if (index === 0 && product.imageUrl) {
                createVariant(product.imageUrl);
              } else {
                this.productMediaService.upload(product.id, item.file).subscribe({
                  next: (mr) => createVariant(mr.success ? mr.data.url : ''),
                  error: () => processItem(index + 1),
                });
              }
            };
            if (tempAttrSnapshot.length > 0) {
              saveAttrs(() => processItem(0));
            } else {
              processItem(0);
            }
          } else {
            this.drawerLoading = false;
            this.toast.show('Produit mis à jour ✓');
            this.closeDrawer();
          }
        } else {
          this.drawerLoading = false;
          this._applyLocalSave(v);
          this.closeDrawer();
        }
      },
      error: () => {
        this.drawerLoading = false;
        this._applyLocalSave(v);
        this.closeDrawer();
      },
    });
  }

  private _applyLocalSave(data: any): void {
    const category = this.categories.find(c => c.id === +data.categoryId) ?? this.categories[0];
    if (this.editingProduct) {
      const idx = this.products.findIndex(p => p.id === this.editingProduct!.id);
      if (idx !== -1) {
        this.products = [...this.products];
        this.products[idx] = { id: this.editingProduct.id, name: data.name, price: +data.price, salePrice: this.editingProduct.salePrice, discountPercent: this.editingProduct.discountPercent, compareAtPrice: this.editingProduct.compareAtPrice, stock: +data.stock, slug: this.editingProduct.slug, gender: data.gender, imageUrl: data.imageUrl, thumbnailUrl: undefined, listImageUrl: undefined, categoryName: category?.name ?? '', active: this.editingProduct.active, featured: this.editingProduct.featured, variantCount: 0, createdAt: this.editingProduct.createdAt };
      }
      this.toast.show('Produit mis à jour ✓');
    } else {
      const now = new Date().toISOString();
      const slug = data.name.toLowerCase().replace(/\s+/g, '-');
      this.products = [{ id: Math.max(...this.products.map(p => p.id), 0) + 1, name: data.name, price: +data.price, salePrice: undefined, discountPercent: undefined, compareAtPrice: undefined, stock: +data.stock, slug, gender: data.gender, imageUrl: data.imageUrl, thumbnailUrl: undefined, listImageUrl: undefined, categoryName: category?.name ?? '', active: true, featured: false, variantCount: 0, createdAt: now }, ...this.products];
      this.toast.show('Produit ajouté ✓');
    }
    this._computeStats();
  }

  // ── Création : image + couleur ────────────────────────────────────────────

  onCreationColorNameChange(name: string): void {
    if (!name) return;
    const lower = name.toLowerCase().trim();
    const normalized = lower.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const hex = this.COLOR_MAP[lower] || this.COLOR_MAP[normalized];
    if (hex) this.pendingCreationColor.colorHex = hex;
  }

  async onCreationImageSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.creationItems.length >= 4) return;
    this.pendingCreationColorError = null;
    try {
      const { file: compressed, preview } = await compressImage(file);
      this.pendingCreationFile = compressed;
      this.pendingCreationPreview = preview;
    } catch {
      this.pendingCreationFile = file;
      const reader = new FileReader();
      reader.onload = (e) => { this.pendingCreationPreview = e.target?.result as string; this.cdr.markForCheck(); };
      reader.readAsDataURL(file);
    }
    this.cdr.markForCheck();
  }

  cancelPendingCreation(): void {
    this.pendingCreationFile = null; this.pendingCreationPreview = null; this.pendingCreationColorError = null;
    this.cdr.markForCheck();
  }

  confirmCreationItem(): void {
    if (!this.pendingCreationFile) return;
    if (!this.pendingCreationColor.variantName.trim()) { this.pendingCreationColorError = 'Le nom de la variante est requis'; return; }
    if (this.tempAttributes.length === 0) {
      if (!/^#[0-9A-Fa-f]{6}$/.test(this.pendingCreationColor.colorHex)) { this.pendingCreationColorError = 'Code couleur invalide (ex: #FF5733)'; return; }
    }
    const attrValueTempIds = this.selectedCreationAttrValueIds.length > 0 ? [...this.selectedCreationAttrValueIds] : undefined;
    this.creationItems = [...this.creationItems, {
      file: this.pendingCreationFile,
      preview: this.pendingCreationPreview!,
      variantName: this.pendingCreationColor.variantName.trim(),
      colorHex: this.pendingCreationColor.colorHex,
      stock: this.pendingCreationColor.stock || 0,
      attributeValueTempIds: attrValueTempIds,
    }];
    this.productForm.patchValue({ stock: this.creationItems.reduce((s, i) => s + i.stock, 0) });
    this.pendingCreationFile = null; this.pendingCreationPreview = null; this.pendingCreationColorError = null;
    this.pendingCreationColor = { variantName: '', colorHex: '#000000', stock: 0 };
    this.cdr.markForCheck();
  }

  removeCreationItem(index: number): void { this.creationItems = this.creationItems.filter((_, i) => i !== index); this.cdr.markForCheck(); }

  // ── Image / vidéo ─────────────────────────────────────────────────────────

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.uploadError = null;
    try {
      const { file: compressed, preview } = await compressImage(file);
      this.selectedImageFile = compressed;
      this.imagePreview = preview;
    } catch {
      this.selectedImageFile = file;
      const reader = new FileReader();
      reader.onload = (e) => { this.imagePreview = e.target?.result as string; this.cdr.markForCheck(); };
      reader.readAsDataURL(file);
    }
    this.cdr.markForCheck();
  }

  onVideoSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    (event.target as HTMLInputElement).value = '';
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { this.uploadError = 'Vidéo trop lourde — max 50 Mo'; this.cdr.markForCheck(); return; }
    this.selectedVideo = file; this.uploadError = null;
    const reader = new FileReader();
    reader.onload = (e) => { this.videoPreview = e.target?.result as string; this.cdr.markForCheck(); };
    reader.readAsDataURL(file);
  }

  removeVideo(): void { this.selectedVideo = null; this.videoPreview = null; this.cdr.markForCheck(); }
  clearImage(): void { this.imagePreview = null; this.selectedImageFile = null; this.uploadError = null; this.cdr.markForCheck(); }

  // ── Galerie ───────────────────────────────────────────────────────────────

  loadMedia(productId: number): void {
    this.mediaLoading = true;
    this.productMediaService.getAll(productId).subscribe({
      next: (r) => {
        if (this.editingProduct?.id !== productId) return;
        if (r.success) this.productMedia = r.data; this.mediaLoading = false; this.cdr.markForCheck();
      },
      error: () => { this.mediaLoading = false; this.cdr.markForCheck(); },
    });
  }

  async onMediaSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !this.editingProduct) return;
    this.mediaColorError = null;
    try {
      const { file: compressed, preview } = await compressImage(file);
      this.pendingMediaFile = compressed;
      this.pendingMediaPreview = preview;
    } catch {
      this.pendingMediaFile = file;
      const reader = new FileReader();
      reader.onload = (e) => { this.pendingMediaPreview = e.target?.result as string; this.cdr.markForCheck(); };
      reader.readAsDataURL(file);
    }
    this.cdr.markForCheck();
  }

  cancelPendingMedia(): void { this.pendingMediaFile = null; this.pendingMediaPreview = null; this.mediaColorError = null; this.cdr.markForCheck(); }

  confirmMediaUpload(): void {
    if (!this.pendingMediaFile || !this.editingProduct) return;
    if (!this.pendingMediaColor.variantName.trim()) { this.mediaColorError = 'Le nom de la variante est requis'; return; }
    if (!/^#[0-9A-Fa-f]{6}$/.test(this.pendingMediaColor.colorHex)) { this.mediaColorError = 'Code couleur invalide (ex: #FF5733)'; return; }
    this.mediaColorError = null;
    this.mediaUploading = true;
    this.cdr.markForCheck();
    const file = this.pendingMediaFile;
    const color = { ...this.pendingMediaColor };
    const targetProductId = this.editingProduct.id;
    this.pendingMediaFile = null; this.pendingMediaPreview = null;
    this.productMediaService.upload(targetProductId, file).subscribe({
      next: (r) => {
        if (r.success) {
          this.productMedia = [...this.productMedia, r.data];
          this.productVariantService.addVariant(targetProductId, {
            variantName: color.variantName.trim(), colorHex: color.colorHex, imageUrl: r.data.url, stock: color.stock || 0,
          }).subscribe({
            next: (vr: any) => { if (vr.success) this.productVariants = [...this.productVariants, vr.data]; this.cdr.markForCheck(); },
            error: (err) => { console.error('Failed to add variant', err); },
          });
          this.toast.show('Photo & couleur ajoutées ✓');
        }
        this.mediaUploading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.mediaUploading = false; this.toast.show('Erreur d\'upload', 'error'); this.cdr.markForCheck(); },
    });
  }

  deleteMedia(mediaId: number): void {
    if (!this.editingProduct) return;
    this.productMediaService.delete(this.editingProduct.id, mediaId).subscribe({
      next: () => { this.productMedia = this.productMedia.filter(m => m.id !== mediaId); this.cdr.markForCheck(); },
      error: () => this.toast.show('Erreur de suppression', 'error'),
    });
  }

  moveMedia(index: number, direction: 'up' | 'down'): void {
    if (!this.editingProduct) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= this.productMedia.length) return;
    const arr = [...this.productMedia];
    [arr[index], arr[newIndex]] = [arr[newIndex], arr[index]];
    this.productMedia = arr;
    this.cdr.markForCheck();
    this.productMediaService.reorder(this.editingProduct.id, arr.map(m => m.id)).subscribe({
      error: () => this.toast.show('Erreur de réorganisation', 'error'),
    });
  }

  // ── Variants ──────────────────────────────────────────────────────────────

  loadVariants(productId: number): void {
    this.variantsLoading = true;
    this.productVariantService.getVariants(productId).subscribe({
      next: (r) => {
        if (this.editingProduct?.id !== productId) return;
        if (r.success) this.productVariants = r.data; this.variantsLoading = false; this.cdr.markForCheck();
      },
      error: () => { this.variantsLoading = false; this.cdr.markForCheck(); },
    });
  }

  onVariantImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.newVariantFile = file;
    const reader = new FileReader();
    reader.onload = (e) => { this.newVariantPreview = e.target?.result as string; this.cdr.markForCheck(); };
    reader.readAsDataURL(file);
  }

  clearVariantImage(): void { this.newVariantFile = null; this.newVariantPreview = null; this.newVariant = { ...this.newVariant, imageUrl: '' }; this.cdr.markForCheck(); }

  // ── Attributs du produit ─────────────────────────────────────────────

  loadAttributes(productId: number): void {
    this.attributesLoading = true;
    this.productVariantService.getAttributes(productId).subscribe({
      next: (r) => {
        if (this.editingProduct?.id !== productId) return;
        if (r.success) this.productAttributes = r.data;
        this.attributesLoading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.attributesLoading = false; this.cdr.markForCheck(); },
    });
  }

  openAddTempAttribute(): void {
    this.editingTempAttr = null;
    this.newAttributeName = '';
    this.newValueInputs = [{ value: '', colorHex: '#000000' }];
    this.attributeError = null;
    this.addAttributeOpen = true;
    this.cdr.markForCheck();
  }

  openEditTempAttribute(attr: { tempId: string; name: string; values: { tempId: string; value: string; colorHex?: string }[] }): void {
    this.editingTempAttr = attr;
    this.newAttributeName = attr.name;
    this.newValueInputs = attr.values.length > 0
      ? attr.values.map(v => ({ value: v.value, colorHex: v.colorHex || '#000000' }))
      : [{ value: '', colorHex: '#000000' }];
    this.attributeError = null;
    this.addAttributeOpen = true;
    this.cdr.markForCheck();
  }

  deleteTempAttribute(tempId: string): void {
    if (!confirm('Supprimer cet attribut et toutes ses valeurs ?')) return;
    this.tempAttributes = this.tempAttributes.filter(a => a.tempId !== tempId);
    this.selectedCreationAttrValueIds = this.selectedCreationAttrValueIds.filter(id =>
      !this.tempAttributes.some(a => a.values.some(v => v.tempId === id))
    );
    this.cdr.markForCheck();
  }

  toggleCreationAttrValue(valueTempId: string): void {
    const idx = this.selectedCreationAttrValueIds.indexOf(valueTempId);
    if (idx >= 0) {
      this.selectedCreationAttrValueIds = this.selectedCreationAttrValueIds.filter(id => id !== valueTempId);
    } else {
      this.selectedCreationAttrValueIds = [...this.selectedCreationAttrValueIds, valueTempId];
    }
    this.pendingCreationColor.variantName = this.tempAttributes
      .flatMap(a => a.values.filter(v => this.selectedCreationAttrValueIds.includes(v.tempId)))
      .map(v => v.value)
      .join(' / ');
    this.cdr.markForCheck();
  }

  openAddAttribute(): void {
    this.editingAttribute = null;
    this.newAttributeName = '';
    this.newValueInputs = [{ value: '', colorHex: '#000000' }];
    this.attributeError = null;
    this.addAttributeOpen = true;
    this.cdr.markForCheck();
  }

  openEditAttribute(attr: ProductAttributeResponse): void {
    this.editingAttribute = attr;
    this.newAttributeName = attr.name;
    this.newValueInputs = attr.values.length > 0
      ? attr.values.map(v => ({ value: v.value, colorHex: v.colorHex || '#000000' }))
      : [{ value: '', colorHex: '#000000' }];
    this.attributeError = null;
    this.addAttributeOpen = true;
    this.cdr.markForCheck();
  }

  cancelAttributeForm(): void {
    this.addAttributeOpen = false;
    this.editingAttribute = null;
    this.editingTempAttr = null;
    this.newAttributeName = '';
    this.newValueInputs = [];
    this.attributeError = null;
    this.cdr.markForCheck();
  }

  addAttributeValueInput(): void {
    this.newValueInputs = [...this.newValueInputs, { value: '', colorHex: '#000000' }];
    this.cdr.markForCheck();
  }

  removeAttributeValueInput(index: number): void {
    this.newValueInputs = this.newValueInputs.filter((_, i) => i !== index);
    this.cdr.markForCheck();
  }

  saveAttribute(): void {
    if (!this.newAttributeName.trim()) return;
    const values = this.newValueInputs
      .filter(v => v.value.trim())
      .map(v => ({ value: v.value.trim(), colorHex: v.colorHex !== '#000000' ? v.colorHex : undefined }));

    if (!this.editingProduct) {
      if (this.editingTempAttr) {
        this.tempAttributes = this.tempAttributes.map(a =>
          a.tempId === this.editingTempAttr!.tempId
            ? { ...a, name: this.newAttributeName.trim(), values: values.map(v => ({ ...v, tempId: crypto.randomUUID() })) }
            : a
        );
      } else {
        this.tempAttributes = [...this.tempAttributes, {
          tempId: crypto.randomUUID(),
          name: this.newAttributeName.trim(),
          values: values.map(v => ({ ...v, tempId: crypto.randomUUID() })),
        }];
      }
      this.cancelAttributeForm();
      this.cdr.markForCheck();
      return;
    }

    if (!this.editingProduct || !this.newAttributeName.trim()) return;
    this.attributeSaving = true;
    this.attributeError = null;
    const productId = this.editingProduct.id;
    const req = { name: this.newAttributeName.trim(), values };

    if (this.editingAttribute) {
      this.productVariantService.updateAttribute(productId, this.editingAttribute.id, req).subscribe({
        next: (r) => {
          if (r.success) {
            this.productAttributes = this.productAttributes.map(a => a.id === r.data.id ? r.data : a);
            this.cancelAttributeForm();
          }
          this.attributeSaving = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.attributeError = err?.error?.message || "Erreur lors de l'enregistrement";
          this.attributeSaving = false;
          this.cdr.markForCheck();
        },
      });
    } else {
      this.productVariantService.addAttribute(productId, req).subscribe({
        next: (r) => {
          if (r.success) {
            this.productAttributes = [...this.productAttributes, r.data];
            this.cancelAttributeForm();
          }
          this.attributeSaving = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.attributeError = err?.error?.message || "Erreur lors de l'ajout";
          this.attributeSaving = false;
          this.cdr.markForCheck();
        },
      });
    }
  }

  deleteAttribute(attributeId: number): void {
    if (!this.editingProduct || !confirm('Supprimer cet attribut et toutes ses valeurs ?')) return;
    this.productVariantService.deleteAttribute(this.editingProduct.id, attributeId).subscribe({
      next: () => {
        this.productAttributes = this.productAttributes.filter(a => a.id !== attributeId);
        this.cdr.markForCheck();
      },
      error: () => this.toast.show("Erreur de suppression", 'error'),
    });
  }

  deleteAttributeValue(valueId: number): void {
    if (!this.editingProduct) return;
    this.productVariantService.deleteAttributeValue(this.editingProduct.id, valueId).subscribe({
      next: () => {
        this.productAttributes = this.productAttributes.map(a => ({
          ...a,
          values: a.values.filter(v => v.id !== valueId),
        }));
        this.cdr.markForCheck();
      },
      error: () => this.toast.show("Erreur de suppression", 'error'),
    });
  }

  generateVariantsFromAttributes(): void {
    if (!this.editingProduct || this.productAttributes.length === 0) return;
    const allValueIds = this.productAttributes.flatMap(a => a.values.map(v => v.id));
    if (allValueIds.length === 0) return;
    this.variantSaving = true;
    this.productVariantService.generateVariants(this.editingProduct.id, {
      attributeValueIds: allValueIds,
      defaultStock: 0,
    }).subscribe({
      next: (r) => {
        if (r.success) {
          this.productVariants = [...this.productVariants, ...r.data];
          this.toast.show(`${r.data.length} variante(s) générée(s) ✓`);
        }
        this.variantSaving = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.variantError = err?.error?.message || "Erreur de génération";
        this.variantSaving = false;
        this.cdr.markForCheck();
      },
    });
  }

  toggleAttributeValue(valueId: number): void {
    const idx = this.variantAttributeValueIds.indexOf(valueId);
    if (idx >= 0) {
      this.variantAttributeValueIds = this.variantAttributeValueIds.filter(id => id !== valueId);
    } else {
      this.variantAttributeValueIds = [...this.variantAttributeValueIds, valueId];
    }
    const attrValues = this.productAttributes.flatMap(a => a.values);
    const selectedValues = attrValues.filter(v => this.variantAttributeValueIds.includes(v.id));
    this.newVariant.variantName = selectedValues.map(v => v.value).join(' / ');
    if (selectedValues.length > 0) {
      const hexValue = selectedValues.find(v => v.colorHex);
      if (hexValue) this.newVariant.colorHex = hexValue.colorHex;
    }
    this.cdr.markForCheck();
  }

  onClickColorAttributeInput(attrName: string, value: string): void {
    const trimmed = value.trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(trimmed)) {
      this.variantFormAttributes[attrName] = trimmed.toUpperCase();
      return;
    }
    const hex = this.COLOR_MAP[trimmed.toLowerCase()];
    this.variantFormAttributes[attrName] = hex ?? trimmed;
  }

  saveVariant(): void {
    if (!this.editingProduct) return;
    if (this.productAttributes.length > 0) {
      const autoName = this.generateVariantName();
      if (!this.newVariant.variantName.trim()) {
        this.newVariant.variantName = autoName;
      }
      if (!autoName && this.variantAttributeValueIds.length === 0) { this.variantError = 'Sélectionnez au moins une valeur d\'attribut ou saisissez un nom'; return; }
    } else {
      if (!this.newVariant.variantName.trim()) { this.variantError = 'Le nom de la variante est requis'; return; }
      if (!/^#[0-9A-Fa-f]{6}$/.test(this.newVariant.colorHex ?? '')) { this.variantError = 'Couleur hex invalide (ex: #FF5733)'; return; }
    }
    this.variantSaving = true;
    this.variantError = null;
    const targetProductId = this.editingProduct.id;
    const doSave = (imageUrl: string) => {
      const payload: ProductVariantRequest = {
        variantName: this.newVariant.variantName,
        colorHex: this.newVariant.colorHex,
        imageUrl,
        stock: this.newVariant.stock,
        sku: this.newVariant.sku,
        barcode: this.newVariant.barcode,
        weight: this.newVariant.weight,
        active: this.newVariant.active ?? true,
        price: this.newVariant.price,
        attributeValueIds: this.variantAttributeValueIds.length > 0 ? this.variantAttributeValueIds : undefined,
      };
      const req$ = this.editingVariant
        ? this.productVariantService.updateVariant(targetProductId, this.editingVariant.id, payload)
        : this.productVariantService.addVariant(targetProductId, payload);
      req$.subscribe({
        next: (r) => {
          if (r.success) {
            this.productVariants = this.editingVariant
              ? this.productVariants.map(v => v.id === r.data.id ? r.data : v)
              : [...this.productVariants, r.data];
            this.cancelEditVariant();
          }
          this.variantSaving = false;
          this.cdr.markForCheck();
        },
        error: (err) => { this.variantError = err?.error?.message || "Erreur lors de l'enregistrement"; this.variantSaving = false; this.cdr.markForCheck(); },
      });
    };

    if (this.newVariantFile) {
      this.productMediaService.upload(targetProductId, this.newVariantFile).subscribe({
        next: (r) => doSave(r.success ? r.data.url : (this.newVariant.imageUrl ?? '')),
        error: () => doSave(this.newVariant.imageUrl ?? ''),
      });
    } else {
      doSave(this.newVariant.imageUrl ?? '');
    }
  }

  startEditVariant(variant: ProductVariant): void {
    this.editingVariant = variant;
    this.newVariant = {
      variantName: variant.variantName,
      colorHex: variant.colorHex || '#000000',
      imageUrl: variant.imageUrl || '',
      stock: variant.stock,
      sku: variant.sku,
      barcode: variant.barcode,
      weight: variant.weight,
      active: variant.active,
      price: variant.price,
    };
    this.variantAttributeValueIds = variant.attributeValues?.map(av => av.id) ?? [];
    this.variantFormAttributes = {};
    this.newVariantFile = null; this.newVariantPreview = variant.imageUrl || null;
    this.variantError = null;
    this.cdr.markForCheck();
  }

  cancelEditVariant(): void {
    this.editingVariant = null;
    this.newVariant = { variantName: '', colorHex: '#000000', imageUrl: '', stock: 0 };
    this.variantFormAttributes = {};
    this.variantAttributeValueIds = [];
    this.newVariantFile = null; this.newVariantPreview = null;
    this.variantError = null;
    this.cdr.markForCheck();
  }

  deleteVariant(variantId: number): void {
    if (!this.editingProduct) return;
    this.productVariantService.deleteVariant(this.editingProduct.id, variantId).subscribe({
      next: () => { this.productVariants = this.productVariants.filter(v => v.id !== variantId); this.cdr.markForCheck(); },
      error: () => this.toast.show('Erreur de suppression', 'error'),
    });
  }
}
