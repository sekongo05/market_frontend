import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil, tap } from 'rxjs/operators';
import { SEARCH_DEBOUNCE } from '../../../../core/constants';
import { ProductService } from '../../../../core/services/product.service';
import { ProductMediaService } from '../../../../core/services/product-media.service';
import { ProductVariantService, ProductVariantRequest } from '../../../../core/services/product-variant.service';
import { CategoryService } from '../../../../core/services/category.service';
import { SupplierService } from '../../../../core/services/supplier.service';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { AdminToastService } from '../../shared/admin-toast.service';
import { ScrollLockService } from '../../../../core/services/scroll-lock.service';
import { ProductResponse, GetProductsParams, ProductMediaItem, ProductVariant, Gender, SortOption } from '../../../../core/models/product.models';
import { CategoryResponse } from '../../../../core/models/category.models';
import { PageResponse } from '../../../../core/models/common.models';
import { SupplierResponse, ProductSupplierResponse } from '../../../../core/models/supplier.models';
import { stockClass } from '../../shared/admin-status.helpers';

@Component({
  selector: 'app-admin-products',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './admin-products.component.html',
})
export class AdminProductsComponent implements OnInit, OnDestroy {
  products: ProductResponse[] = [];
  productsLoading = false;
  productsPage = 0;
  productsTotalPages = 0;
  productsTotalElements = 0;
  productSearchQuery = '';

  /* ── Filtres ── */
  filterGender: string   = '';
  filterStock: '' | 'inStock' | 'outOfStock' = '';
  filterActive: '' | 'active' | 'inactive'   = '';
  filterFeatured = false;
  filterCategoryId: number | '' = '';
  sortBy: string = 'newest';

  drawerOpen = false;
  editingProduct: ProductResponse | null = null;
  drawerLoading = false;
  drawerError: string | null = null;
  productForm!: FormGroup;
  drawerTab: 'info' | 'media' | 'variants' = 'info';

  productMedia: ProductMediaItem[] = [];
  mediaLoading = false;
  mediaUploading = false;
  pendingMediaFile: File | null = null;
  pendingMediaPreview: string | null = null;
  pendingMediaColor = { variantName: '', colorHex: '#000000', stock: 0 };
  pendingMediaIsVariant = false;
  pendingMediaAltText = '';
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

  get categoryVariantAttributes(): { name: string; type: string; options?: string[] }[] {
    const cfg = this.editingProduct?.category?.variantConfig;
    if (!cfg) return [];
    try { return JSON.parse(cfg); } catch { return []; }
  }

  get selectedCategoryHasVariants(): boolean {
    const catId = this.productForm?.get('categoryId')?.value;
    if (!catId) return false;
    const cat = this.productCategories.find(c => c.id === +catId);
    return !!cat?.variantConfig;
  }

  get selectedCategoryVariantAttributes(): { name: string; type: string; options?: string[] }[] {
    const catId = this.productForm?.get('categoryId')?.value;
    if (!catId) return [];
    const cat = this.productCategories.find(c => c.id === +catId);
    if (!cat?.variantConfig) return [];
    try { return JSON.parse(cat.variantConfig); } catch { return []; }
  }

  get attributesAvailableValues(): Record<string, { value: string; count: number }[]> {
    const result: Record<string, Set<string>> = {};
    for (const attr of this.categoryVariantAttributes) {
      result[attr.name] = new Set();
    }
    for (const v of this.productVariants) {
      if (v.id === this.editingVariant?.id) continue;
      for (const [key, val] of Object.entries(v.attributes ?? {})) {
        if (result[key]) result[key].add(val);
      }
    }
    const out: Record<string, { value: string; count: number }[]> = {};
    for (const [key, set] of Object.entries(result)) {
      out[key] = [...set].map(value => ({ value, count: this.productVariants.filter(v => v.attributes?.[key] === value).length }));
    }
    return out;
  }

  generateVariantName(): string {
    const vals = Object.values(this.variantFormAttributes).filter(Boolean);
    return vals.join(' / ') || '';
  }

  wizardStep: 1 | 2 = 1;
  hasVariantsToggle = false;
  creationItems: { file: File; preview: string; variantName: string; colorHex: string; stock: number }[] = [];
  pendingCreationFile: File | null = null;
  pendingCreationPreview: string | null = null;
  pendingCreationColor = { variantName: '', colorHex: '#000000', stock: 0 };
  pendingCreationColorError: string | null = null;

  selectedVideo: File | null = null;
  videoPreview: string | null = null;
  imagePreview: string | null = null;
  selectedImageFile: File | null = null;
  uploadError: string | null = null;

  editingStockId: number | null = null;
  editingStockValue = 0;
  stockSavingId: number | null = null;
  confirmDeleteId: number | null = null;
  discountEditingId: number | null = null;
  discountEditValue = 0;
  discountSavingId: number | null = null;
  toggleActivatingId: number | null = null;
  toggleFeaturedId: number | null = null;
  priceEditingId: number | null = null;
  priceEditValue = 0;
  priceSavingId: number | null = null;

  productCategories: CategoryResponse[] = [];

  /* ── Fournisseurs ── */
  allSuppliers: SupplierResponse[] = [];
  productSuppliers: ProductSupplierResponse[] = [];
  supplierFormOpen = false;
  supplierFormSupplierId: number | null = null;
  supplierFormPurchasePrice: number | null = null;
  supplierFormTransport: number = 0;
  supplierFormDefault = false;
  supplierFormNotes = '';
  supplierFormLoading = false;
  supplierFormError: string | null = null;
  editingSupplierLinkId: number | null = null;
  readonly genders: { value: Gender; label: string }[] = [
    { value: 'HOMME',  label: 'Homme'   },
    { value: 'FEMME',  label: 'Femme'   },
    { value: 'UNISEX', label: 'Unisexe' },
  ];

  readonly stockClass = stockClass;
  readonly formatCurrency = (v: number | null | undefined) => `${Number(v ?? 0).toLocaleString('fr-FR')}`;

  private readonly COLOR_MAP: Record<string, string> = {
    'rouge': '#FF0000', 'bleu': '#0000FF', 'vert': '#008000',
    'noir': '#000000', 'blanc': '#FFFFFF', 'jaune': '#FFD700',
    'orange': '#FF8C00', 'violet': '#800080', 'rose': '#FF69B4',
    'gris': '#808080', 'marron': '#8B4513', 'beige': '#F5F5DC',
    'or': '#D4AF37', 'argent': '#C0C0C0', 'turquoise': '#40E0D0',
    'bordeaux': '#800020', 'marine': '#001F5B', 'kaki': '#78866B',
  };

  private readonly searchSubject = new Subject<string>();
  private readonly destroy$ = new Subject<void>();

  constructor(
    private productService: ProductService,
    private productMediaService: ProductMediaService,
    private productVariantService: ProductVariantService,
    private categoryService: CategoryService,
    private supplierService: SupplierService,
    private wsService: WebSocketService,
    private toast: AdminToastService,
    private scrollLock: ScrollLockService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadProducts(0);
    this.initProductForm();
    this.loadProductCategories();
    this.searchSubject.pipe(
      debounceTime(SEARCH_DEBOUNCE),
      distinctUntilChanged(),
      tap(query => this.productSearchQuery = query),
      takeUntil(this.destroy$),
    ).subscribe(() => this.loadProducts(0));
    this.wsService.staffEvent$.pipe(takeUntil(this.destroy$)).subscribe(e => {
      if (e.module === 'products') this.loadProducts(this.productsPage);
      if (e.module === 'suppliers') { this.allSuppliers = []; this._lastSuppliersFetch = 0; }
    });
  }

  ngOnDestroy(): void {
    this.scrollLock.forceUnlock();
    this.destroy$.next();
    this.destroy$.complete();
  }

  get productPages(): number[] { return Array.from({ length: this.productsTotalPages }, (_, i) => i); }

  get hasActiveFilters(): boolean {
    return !!this.productSearchQuery || !!this.filterGender || !!this.filterStock
        || !!this.filterActive || !!this.filterCategoryId || this.sortBy !== 'newest' || this.filterFeatured;
  }

  clearFilters(): void {
    this.productSearchQuery = '';
    this.filterGender       = '';
    this.filterStock        = '';
    this.filterActive       = '';
    this.filterFeatured     = false;
    this.filterCategoryId   = '';
    this.sortBy             = 'newest';
    this.loadProducts(0);
  }

  applyProductFilter(): void { this.loadProducts(0); }

  isNewProduct(p: ProductResponse): boolean {
    return (Date.now() - new Date(p.createdAt).getTime()) / 86_400_000 < 7;
  }

  isLowStock(p: ProductResponse): boolean {
    return p.stock > 0 && p.stock <= 3;
  }
  get isStep1Valid(): boolean {
    const f = this.productForm;
    const catHasVariants = this.selectedCategoryHasVariants;
    if (catHasVariants) {
      return !!(
        f.get('name')?.valid && f.get('description')?.valid &&
        f.get('categoryId')?.value && f.get('gender')?.value &&
        f.get('price')?.valid && f.get('costPrice')?.valid
      );
    }
    return !!(
      f.get('name')?.valid && f.get('description')?.valid &&
      f.get('categoryId')?.value && f.get('gender')?.value &&
      f.get('price')?.valid && f.get('stock')?.valid &&
      f.get('costPrice')?.valid
    );
  }
  get creationTotalStock(): number { return this.creationItems.reduce((s, i) => s + i.stock, 0); }

  compareAtSavings(compareAtPrice: number | undefined, price: number): number {
    if (!compareAtPrice || compareAtPrice <= price) return 0;
    return Math.round((compareAtPrice - price) / compareAtPrice * 100);
  }

  private initProductForm(product?: ProductResponse): void {
    this.productForm = this.fb.group({
      name:            [product?.name             ?? '', Validators.required],
      description:     [product?.description      ?? '', Validators.required],
      price:           [product?.price            ?? null, [Validators.required, Validators.min(1)]],
      compareAtPrice:  [product?.compareAtPrice   ?? null, [Validators.min(0)]],
      costPrice:       [product?.costPrice        ?? null, [Validators.required, Validators.min(1)]],
      stock:           [product?.stock            ?? null, [Validators.required, Validators.min(0)]],
      gender:          [product?.gender           ?? 'UNISEX', Validators.required],
      categoryId:      [product?.category?.id    ?? null, Validators.required],
      metaTitle:       [product?.metaTitle        ?? ''],
      metaDescription: [product?.metaDescription  ?? ''],
    });
  }

  loadProducts(page = 0): void {
    this.productsLoading = true;
    const params: GetProductsParams = { page, size: 12 };
    if (this.productSearchQuery)  params.search     = this.productSearchQuery;
    if (this.filterGender)        params.gender     = this.filterGender as Gender;
    if (this.filterCategoryId)    params.categoryId = +this.filterCategoryId;
    if (this.sortBy)              params.sort       = this.sortBy as SortOption;
    if (this.filterStock === 'inStock')   params.inStock = true;
    if (this.filterStock === 'outOfStock') params.inStock = false;
    if (this.filterActive === 'active')   params.active  = true;
    if (this.filterActive === 'inactive') params.active  = false;
    if (this.filterFeatured)              params.featured = true;
    this.productService.getProducts(params).subscribe({
      next: (r) => {
        if (r.success) {
          const pg = r.data as PageResponse<ProductResponse>;
          this.products             = pg.content;
          this.productsTotalPages   = pg.totalPages;
          this.productsTotalElements = pg.totalElements;
          this.productsPage         = page;
        }
        this.productsLoading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.productsLoading = false; this.cdr.markForCheck(); },
    });
  }

  onProductSearchChange(value: string): void {
    this.searchSubject.next(value);
  }

  openCreateDrawer(): void {
    this.editingProduct = null;
    this._resetDrawer();
    this.initProductForm();
    this.wizardStep = 1;
    this.hasVariantsToggle = false;
    this.drawerOpen = true;
    this.scrollLock.lock();
    this.loadProductCategories();
    this.cdr.markForCheck();
    setTimeout(() => document.getElementById('admin-drawer-panel')?.scrollTo(0, 0), 0);
  }

  openEditDrawer(product: ProductResponse): void {
    this.editingProduct = product;
    this._resetDrawer();
    this.imagePreview = product.imageUrl || null;
    this.productMedia = product.media ?? [];
    this.productVariants = product.variants ?? [];
    this.initProductForm(product);
    this.drawerOpen = true;
    this.scrollLock.lock();
    this.loadMedia(product.id);
    this.loadVariants(product.id);
    this.loadProductSuppliers(product.id);
    this.loadAllSuppliers();
    this.cdr.markForCheck();
    setTimeout(() => document.getElementById('admin-drawer-panel')?.scrollTo(0, 0), 0);
  }

  setDrawerTab(tab: 'info' | 'media' | 'variants'): void {
    this.drawerTab = tab;
    document.getElementById('admin-drawer-panel')?.scrollTo(0, 0);
  }

  closeDrawer(): void {
    this.drawerOpen = false;
    this.editingProduct = null;
    this._resetDrawer();
    this.scrollLock.unlock();
    this.cdr.markForCheck();
  }

  private _resetDrawer(): void {
    this.drawerError = null;
    this.productSuppliers = [];
    this.supplierFormOpen = false;
    this.supplierFormSupplierId = null;
    this.supplierFormPurchasePrice = null;
    this.supplierFormTransport = 0;
    this.supplierFormDefault = false;
    this.supplierFormNotes = '';
    this.supplierFormError = null;
    this.editingSupplierLinkId = null;
    this.wizardStep = 1;
    this.hasVariantsToggle = false;
    this.creationItems = [];
    this.pendingCreationFile = null;
    this.pendingCreationPreview = null;
    this.pendingCreationColorError = null;
    this.pendingCreationColor = { variantName: '', colorHex: '#000000', stock: 0 };
    this.selectedVideo = null;
    this.videoPreview = null;
    this.imagePreview = null;
    this.selectedImageFile = null;
    this.uploadError = null;
    this.drawerTab = 'info';
    this.productMedia = [];
    this.productVariants = [];
    this.variantError = null;
    this.editingVariant = null;
    this.newVariant = { variantName: '', colorHex: '#000000', imageUrl: '', stock: 0 };
    this.variantFormAttributes = {};
    this.newVariantFile = null;
    this.newVariantPreview = null;
    this.pendingMediaFile = null;
    this.pendingMediaPreview = null;
    this.pendingMediaIsVariant = false;
    this.pendingMediaAltText = '';
    this.mediaColorError = null;
  }

  loadProductCategories(): void {
    this.categoryService.getCategories().subscribe({
      next: (r) => { if (r.success) this.productCategories = r.data; this.cdr.markForCheck(); },
      error: (err) => { console.error('Failed to load categories', err); },
    });
  }

  saveProduct(): void {
    if (this.productForm.invalid || this.drawerLoading) return;
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
      if (v.metaTitle?.trim()) fd.append('metaTitle', v.metaTitle.trim());
      if (v.metaDescription?.trim()) fd.append('metaDescription', v.metaDescription.trim());
      if (v.compareAtPrice && +v.compareAtPrice > 0) fd.append('compareAtPrice', v.compareAtPrice.toString());
      if (v.costPrice && +v.costPrice > 0) fd.append('costPrice', v.costPrice.toString());
      req$ = this.productService.updateProduct(this.editingProduct.id, fd);
    } else {
      fd.append('costPrice', v.costPrice.toString());
      if (this.hasVariantsToggle && this.creationItems.length > 0) {
        fd.append('images', this.creationItems[0].file);
      } else if (!this.hasVariantsToggle && this.selectedImageFile) {
        fd.append('images', this.selectedImageFile);
      }
      if (this.selectedVideo) fd.append('video', this.selectedVideo);
      req$ = this.productService.createProduct(fd);
    }

    const wasCreating = !this.editingProduct;
    const itemsSnapshot = [...this.creationItems];
    req$.subscribe({
      next: (r) => {
        this.loadProducts(this.productsPage);
        if (wasCreating && r.data) {
          const product = r.data;
          this.editingProduct = product;
          this.initProductForm(product);
          this.drawerTab = 'media';
          if (itemsSnapshot.length === 0) {
            this.drawerLoading = false;
            this.productVariants = [];
            this.productMedia = [];
            this.toast.show('Produit créé ✓');
            this.cdr.markForCheck();
            return;
          }
          const processItem = (index: number) => {
            if (index >= itemsSnapshot.length) {
              this.drawerLoading = false;
              this.creationItems = [];
              this.loadVariants(product.id);
              this.loadMedia(product.id);
              this.toast.show(`Produit créé avec ${itemsSnapshot.length} couleur(s) ✓`);
              this.cdr.markForCheck();
              return;
            }
            const item = itemsSnapshot[index];
            const createVariant = (imageUrl: string) => {
              this.productVariantService.addVariant(product.id, {
                variantName: item.variantName, colorHex: item.colorHex, imageUrl, stock: item.stock,
              }).subscribe({ next: () => processItem(index + 1), error: () => processItem(index + 1) });
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
          processItem(0);
        } else {
          this.drawerLoading = false;
          if (r.data) {
            this.editingProduct = r.data;
            this.initProductForm(r.data);
            this.imagePreview = r.data.imageUrl || null;
          }
          this.toast.show('Produit mis à jour ✓');
          this.cdr.markForCheck();
        }
      },
      error: (err) => {
        this.drawerLoading = false;
        this.drawerError = err?.error?.message || 'Erreur lors de la sauvegarde';
        this.cdr.markForCheck();
      },
    });
  }

  startEditStock(product: ProductResponse): void {
    this.confirmDeleteId = null;
    this.editingStockId = product.id;
    this.editingStockValue = product.stock;
    this.cdr.markForCheck();
  }

  adjustStock(delta: number): void {
    this.editingStockValue = Math.max(0, (this.editingStockValue || 0) + delta);
    this.cdr.markForCheck();
  }

  confirmEditStock(product: ProductResponse): void {
    const newStock = Math.max(0, Math.round(+this.editingStockValue || 0));
    this.editingStockId = null;
    if (newStock === product.stock) { this.cdr.markForCheck(); return; }
    this.stockSavingId = product.id;
    const fd = new FormData();
    fd.append('name', product.name);
    if (product.description) fd.append('description', product.description);
    fd.append('price', product.price.toString());
    fd.append('stock', newStock.toString());
    fd.append('gender', product.gender);
    if (product.category?.id) fd.append('categoryId', product.category.id.toString());
    const apply = () => {
      const idx = this.products.findIndex(p => p.id === product.id);
      if (idx !== -1) { this.products = [...this.products]; this.products[idx] = { ...this.products[idx], stock: newStock }; }
      this.toast.show(`Stock mis à jour : ${newStock}`);
      this.stockSavingId = null;
      this.cdr.markForCheck();
    };
    this.productService.updateProduct(product.id, fd).subscribe({ next: apply, error: apply });
  }

  cancelEditStock(): void { this.editingStockId = null; this.cdr.markForCheck(); }

  startDelete(id: number): void { this.editingStockId = null; this.confirmDeleteId = id; this.cdr.markForCheck(); }
  cancelDelete(): void { this.confirmDeleteId = null; this.cdr.markForCheck(); }

  doDelete(product: ProductResponse): void {
    this.confirmDeleteId = null;
    this.productService.deleteProduct(product.id).subscribe({
      next: () => { this.loadProducts(this.productsPage); this.toast.show(`"${product.name}" supprimé`); this.cdr.markForCheck(); },
      error: (err) => { this.toast.show(err?.error?.message || 'Erreur de suppression', 'error'); this.cdr.markForCheck(); },
    });
  }

  startEditDiscount(product: ProductResponse): void {
    this.discountEditingId = product.id;
    this.discountEditValue = product.discountPercent ?? 0;
    this.cdr.markForCheck();
  }

  confirmEditDiscount(product: ProductResponse): void {
    const pct = Math.max(0, Math.min(100, Math.round(+this.discountEditValue || 0)));
    this.discountEditingId = null;
    if ((product.discountPercent ?? 0) === pct) return;
    this.discountSavingId = product.id;
    this.cdr.markForCheck();
    this.productService.setDiscount(product.id, pct > 0 ? pct : null).subscribe({
      next: (r) => {
        if (r.success) {
          const idx = this.products.findIndex(p => p.id === product.id);
          if (idx !== -1) this.products[idx] = { ...this.products[idx], discountPercent: r.data.discountPercent, salePrice: r.data.salePrice };
          this.products = [...this.products];
        }
        this.discountSavingId = null;
        this.cdr.markForCheck();
      },
      error: () => { this.discountSavingId = null; this.cdr.markForCheck(); },
    });
  }

  cancelEditDiscount(): void { this.discountEditingId = null; this.cdr.markForCheck(); }

  toggleProductActive(product: ProductResponse): void {
    this.toggleActivatingId = product.id;
    this.productService.toggleActive(product.id).subscribe({
      next: (r) => {
        if (r.success) {
          const idx = this.products.findIndex(p => p.id === product.id);
          if (idx !== -1) { this.products = [...this.products]; this.products[idx] = r.data; }
          this.toast.show(`"${product.name}" ${r.data.active ? 'activé' : 'désactivé'}`);
        }
        this.toggleActivatingId = null;
        this.cdr.markForCheck();
      },
      error: () => { this.toggleActivatingId = null; this.cdr.markForCheck(); },
    });
  }

  toggleProductFeatured(product: ProductResponse): void {
    this.toggleFeaturedId = product.id;
    this.productService.toggleFeatured(product.id).subscribe({
      next: (r) => {
        if (r.success) {
          const idx = this.products.findIndex(p => p.id === product.id);
          if (idx !== -1) { this.products = [...this.products]; this.products[idx] = r.data; }
          this.toast.show(`"${product.name}" ${r.data.featured ? 'en vedette ⭐' : 'retiré des vedettes'}`);
        }
        this.toggleFeaturedId = null;
        this.cdr.markForCheck();
      },
      error: () => { this.toggleFeaturedId = null; this.cdr.markForCheck(); },
    });
  }

  startEditPrice(product: ProductResponse): void {
    this.priceEditingId = product.id;
    this.priceEditValue = product.price;
    this.cdr.markForCheck();
  }

  confirmEditPrice(product: ProductResponse): void {
    const newPrice = Math.max(1, Math.round(+this.priceEditValue || 1));
    this.priceEditingId = null;
    if (newPrice === product.price) { this.cdr.markForCheck(); return; }
    this.priceSavingId = product.id;
    const fd = new FormData();
    fd.append('name', product.name);
    if (product.description) fd.append('description', product.description);
    fd.append('price', newPrice.toString());
    fd.append('stock', product.stock.toString());
    fd.append('gender', product.gender);
    if (product.category?.id) fd.append('categoryId', product.category.id.toString());
    this.productService.updateProduct(product.id, fd).subscribe({
      next: (r) => {
        if (r.success) {
          const idx = this.products.findIndex(p => p.id === product.id);
          if (idx !== -1) { this.products = [...this.products]; this.products[idx] = { ...this.products[idx], price: newPrice }; }
          this.toast.show(`Prix mis à jour : ${newPrice.toLocaleString('fr-FR')} FCFA`);
        }
        this.priceSavingId = null;
        this.cdr.markForCheck();
      },
      error: () => { this.priceSavingId = null; this.cdr.markForCheck(); },
    });
  }

  cancelEditPrice(): void { this.priceEditingId = null; this.cdr.markForCheck(); }

  getVariantForMedia(mediaUrl: string): ProductVariant | undefined {
    return this.productVariants.find(v => v.imageUrl === mediaUrl);
  }

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

  onMediaSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !this.editingProduct) return;
    this.pendingMediaFile = file;
    this.mediaColorError = null;
    const reader = new FileReader();
    reader.onload = (e) => { this.pendingMediaPreview = e.target?.result as string; this.cdr.markForCheck(); };
    reader.readAsDataURL(file);
  }

  cancelPendingMedia(): void {
    this.pendingMediaFile = null;
    this.pendingMediaPreview = null;
    this.mediaColorError = null;
    this.pendingMediaIsVariant = false;
    this.pendingMediaAltText = '';
    this.pendingMediaColor = { variantName: '', colorHex: '#000000', stock: 0 };
    this.cdr.markForCheck();
  }

  confirmMediaUpload(): void {
    if (!this.pendingMediaFile || !this.editingProduct) return;
    if (this.pendingMediaIsVariant) {
      if (!this.pendingMediaColor.variantName.trim()) { this.mediaColorError = 'Le nom de la variante est requis'; return; }
      if (!/^#[0-9A-Fa-f]{6}$/.test(this.pendingMediaColor.colorHex)) { this.mediaColorError = 'Code couleur invalide (ex: #FF5733)'; return; }
    }
    this.mediaColorError = null;
    this.mediaUploading = true;
    this.cdr.markForCheck();
    const file = this.pendingMediaFile;
    const altText = this.pendingMediaAltText.trim();
    const isVariant = this.pendingMediaIsVariant;
    const color = { ...this.pendingMediaColor };
    const targetProductId = this.editingProduct.id;
    this.pendingMediaFile = null;
    this.pendingMediaPreview = null;
    this.pendingMediaAltText = '';
    this.pendingMediaIsVariant = false;
    this.productMediaService.upload(targetProductId, file, altText || undefined).subscribe({
      next: (r) => {
        if (r.success) {
          this.productMedia = [...this.productMedia, r.data];
          if (isVariant && color.variantName.trim()) {
            this.productVariantService.addVariant(targetProductId, {
              variantName: color.variantName.trim(), colorHex: color.colorHex, imageUrl: r.data.url, stock: color.stock || 0,
            }).subscribe({
              next: (vr: any) => { if (vr.success) this.productVariants = [...this.productVariants, vr.data]; this.cdr.markForCheck(); },
              error: (err) => { console.error('Failed to add variant', err); },
            });
            this.toast.show('Photo & couleur ajoutées ✓');
          } else {
            this.toast.show('Photo ajoutée ✓');
          }
        }
        this.mediaUploading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.mediaUploading = false; this.toast.show("Erreur d'upload", 'error'); this.cdr.markForCheck(); },
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

  onColorAttributeInput(attrName: string, value: string): void {
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
    if (this.categoryVariantAttributes.length > 0) {
      this.newVariant.attributes = { ...this.variantFormAttributes };
      const autoName = this.generateVariantName();
      if (!this.newVariant.variantName.trim()) {
        this.newVariant.variantName = autoName;
      }
      if (!autoName) { this.variantError = 'Remplissez au moins un attribut'; return; }
    } else {
      if (!this.newVariant.variantName.trim()) { this.variantError = 'Le nom de la variante est requis'; return; }
      if (!/^#[0-9A-Fa-f]{6}$/.test(this.newVariant.colorHex ?? '')) { this.variantError = 'Couleur hex invalide (ex: #FF5733)'; return; }
    }
    this.variantSaving = true;
    this.variantError = null;
    const targetProductId = this.editingProduct.id;
    const doSave = (imageUrl: string) => {
      const payload = { ...this.newVariant, imageUrl };
      const req$ = this.editingVariant
        ? this.productVariantService.updateVariant(targetProductId, this.editingVariant.id, payload)
        : this.productVariantService.addVariant(targetProductId, payload);
      req$.subscribe({
        next: (r) => {
          if (r.success) {
            if (this.editingVariant) {
              this.productVariants = this.productVariants.map(v => v.id === r.data.id ? r.data : v);
            } else {
              this.productVariants = [...this.productVariants, r.data];
            }
            this.editingVariant = null;
            this.newVariant = { variantName: '', colorHex: '#000000', imageUrl: '', stock: 0 };
            this.variantFormAttributes = {};
            this.newVariantFile = null;
            this.newVariantPreview = null;
          }
          this.variantSaving = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.variantError = err?.error?.message || "Erreur lors de l'enregistrement";
          this.variantSaving = false;
          this.cdr.markForCheck();
        },
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
    this.newVariant = { variantName: variant.variantName, colorHex: variant.colorHex || '#000000', imageUrl: variant.imageUrl || '', stock: variant.stock, attributes: variant.attributes };
    this.variantFormAttributes = variant.attributes ? { ...variant.attributes } : {};
    this.newVariantFile = null;
    this.newVariantPreview = variant.imageUrl || null;
    this.variantError = null;
    this.cdr.markForCheck();
  }

  cancelEditVariant(): void {
    this.editingVariant = null;
    this.newVariant = { variantName: '', colorHex: '#000000', imageUrl: '', stock: 0 };
    this.variantFormAttributes = {};
    this.newVariantFile = null;
    this.newVariantPreview = null;
    this.variantError = null;
    this.cdr.markForCheck();
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

  clearVariantImage(): void {
    this.newVariantFile = null;
    this.newVariantPreview = null;
    this.newVariant = { ...this.newVariant, imageUrl: '' };
    this.cdr.markForCheck();
  }

  deleteVariant(variantId: number): void {
    if (!this.editingProduct) return;
    this.productVariantService.deleteVariant(this.editingProduct.id, variantId).subscribe({
      next: () => { this.productVariants = this.productVariants.filter(v => v.id !== variantId); this.cdr.markForCheck(); },
      error: () => this.toast.show('Erreur de suppression', 'error'),
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (file.type.startsWith('image/')) {
      this.selectedImageFile = file;
      this.uploadError = null;
      const reader = new FileReader();
      reader.onload = (e) => { this.imagePreview = e.target?.result as string; this.cdr.markForCheck(); };
      reader.readAsDataURL(file);
    }
  }

  onVideoSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    (event.target as HTMLInputElement).value = '';
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { this.uploadError = 'Vidéo trop lourde — max 50 Mo'; this.cdr.markForCheck(); return; }
    this.selectedVideo = file;
    this.uploadError = null;
    const reader = new FileReader();
    reader.onload = (e) => { this.videoPreview = e.target?.result as string; this.cdr.markForCheck(); };
    reader.readAsDataURL(file);
  }

  removeVideo(): void { this.selectedVideo = null; this.videoPreview = null; this.cdr.markForCheck(); }
  clearImage(): void { this.imagePreview = null; this.selectedImageFile = null; this.uploadError = null; this.cdr.markForCheck(); }

  onCreationColorNameChange(name: string): void {
    const hex = this.COLOR_MAP[name.toLowerCase().trim()];
    if (hex) this.pendingCreationColor.colorHex = hex;
  }

  /** Retourne les attributs dynamiques définis par la catégorie du produit, sous forme de tableau */
  get variantAttributes(): { name: string; type: string }[] {
    const cfg = this.editingProduct?.category?.variantConfig;
    if (!cfg) return [];
    try { return JSON.parse(cfg); } catch { return []; }
  }

  onCreationImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.creationItems.length >= 4) return;
    this.pendingCreationFile = file;
    this.pendingCreationColorError = null;
    const reader = new FileReader();
    reader.onload = (e) => { this.pendingCreationPreview = e.target?.result as string; this.cdr.markForCheck(); };
    reader.readAsDataURL(file);
  }

  cancelPendingCreation(): void {
    this.pendingCreationFile = null;
    this.pendingCreationPreview = null;
    this.pendingCreationColorError = null;
  }

  confirmCreationItem(): void {
    if (!this.pendingCreationFile) return;
    if (!this.pendingCreationColor.variantName.trim()) { this.pendingCreationColorError = 'Le nom de la variante est requis'; return; }
    if (!/^#[0-9A-Fa-f]{6}$/.test(this.pendingCreationColor.colorHex)) { this.pendingCreationColorError = 'Code couleur invalide (ex: #FF5733)'; return; }
    this.creationItems = [...this.creationItems, {
      file: this.pendingCreationFile,
      preview: this.pendingCreationPreview!,
      variantName: this.pendingCreationColor.variantName.trim(),
      colorHex: this.pendingCreationColor.colorHex,
      stock: this.pendingCreationColor.stock || 0,
    }];
    const totalStock = this.creationItems.reduce((sum, i) => sum + i.stock, 0);
    this.productForm.patchValue({ stock: totalStock });
    this.pendingCreationFile = null;
    this.pendingCreationPreview = null;
    this.pendingCreationColorError = null;
    this.pendingCreationColor = { variantName: '', colorHex: '#000000', stock: 0 };
    this.cdr.markForCheck();
  }

  removeCreationItem(index: number): void {
    this.creationItems = this.creationItems.filter((_, i) => i !== index);
    this.cdr.markForCheck();
  }

  goToNextStep(): void {
    if (this.wizardStep === 1) {
      ['name', 'description', 'categoryId', 'gender', 'price', 'stock'].forEach(f => this.productForm.get(f)?.markAsTouched());
      if (!this.isStep1Valid) { this.cdr.markForCheck(); return; }
    }
    if (this.wizardStep < 2) {
      this.wizardStep = (this.wizardStep + 1) as 1 | 2;
      document.getElementById('admin-drawer-panel')?.scrollTo(0, 0);
      this.cdr.markForCheck();
    }
  }

  goToPrevStep(): void {
    if (this.wizardStep > 1) {
      this.wizardStep = (this.wizardStep - 1) as 1 | 2;
      document.getElementById('admin-drawer-panel')?.scrollTo(0, 0);
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
    if (!this.hasVariantsToggle) this.productForm.patchValue({ stock: null });
    this.cdr.markForCheck();
  }

  // ── Fournisseurs (dans le drawer produit) ─────────────────────────

  loadProductSuppliers(productId: number): void {
    this.supplierService.getSuppliersForProduct(productId).subscribe({
      next: (r) => { if (r.success) { this.productSuppliers = r.data ?? []; this.cdr.markForCheck(); } },
      error: (err) => { console.error('Failed to load product suppliers', err); },
    });
  }

  private _lastSuppliersFetch = 0;
  loadAllSuppliers(): void {
    const now = Date.now();
    if (this.allSuppliers.length && now - this._lastSuppliersFetch < 300_000) return;
    this._lastSuppliersFetch = now;
    this.supplierService.getAll().subscribe({
      next: (r) => { if (r.success) { this.allSuppliers = r.data ?? []; this.cdr.markForCheck(); } },
      error: (err) => { console.error('Failed to load all suppliers', err); },
    });
  }

  openSupplierForm(link?: ProductSupplierResponse): void {
    this.editingSupplierLinkId = link?.id ?? null;
    this.supplierFormSupplierId = link?.supplierId ?? null;
    this.supplierFormPurchasePrice = link?.purchasePrice ?? null;
    this.supplierFormTransport = link?.transportCostPerUnit ?? 0;
    this.supplierFormDefault = link?.isDefault ?? false;
    this.supplierFormNotes = link?.notes ?? '';
    this.supplierFormError = null;
    this.supplierFormOpen = true;
    this.cdr.markForCheck();
  }

  closeSupplierForm(): void {
    this.supplierFormOpen = false;
    this.editingSupplierLinkId = null;
    this.supplierFormError = null;
    this.cdr.markForCheck();
  }

  saveSupplierLink(): void {
    if (!this.supplierFormSupplierId || !this.supplierFormPurchasePrice) {
      this.supplierFormError = 'Fournisseur et prix d\'achat sont obligatoires';
      return;
    }
    if (!this.editingProduct) return;

    this.supplierFormLoading = true;
    this.supplierFormError = null;

    const req = {
      supplierId: this.supplierFormSupplierId,
      purchasePrice: this.supplierFormPurchasePrice,
      transportCostPerUnit: this.supplierFormTransport ?? 0,
      isDefault: this.supplierFormDefault,
      notes: this.supplierFormNotes,
    };

    const req$ = this.editingSupplierLinkId
      ? this.supplierService.updateLink(this.editingProduct.id, this.editingSupplierLinkId, req)
      : this.supplierService.linkSupplier(this.editingProduct.id, req);

    req$.subscribe({
      next: (r) => {
        if (r.success) {
          this.productSuppliers = r.data ?? [];
          this.toast.show('Fournisseur enregistré', 'success');
          this.closeSupplierForm();
          if (this.supplierFormDefault && this.editingProduct) {
            this.productForm.patchValue({ costPrice: (this.supplierFormPurchasePrice ?? 0) + (this.supplierFormTransport ?? 0) });
          }
        } else {
          this.supplierFormError = r.message ?? 'Erreur';
        }
        this.supplierFormLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.supplierFormError = err?.error?.message ?? 'Erreur serveur';
        this.supplierFormLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  removeSupplierLink(linkId: number): void {
    if (!this.editingProduct) return;
    this.supplierService.unlinkSupplier(this.editingProduct.id, linkId).subscribe({
      next: () => {
        this.productSuppliers = this.productSuppliers.filter(s => s.id !== linkId);
        this.toast.show('Fournisseur retiré', 'success');
        this.cdr.markForCheck();
      },
      error: () => this.toast.show('Erreur lors de la suppression', 'error'),
    });
  }

  get availableSuppliersForForm(): SupplierResponse[] {
    const linked = new Set(this.productSuppliers.map(ps => ps.supplierId));
    if (this.editingSupplierLinkId) return this.allSuppliers;
    return this.allSuppliers.filter(s => !linked.has(s.id));
  }

  supplierRealCost(ps: ProductSupplierResponse): number {
    return ps.purchasePrice + ps.transportCostPerUnit;
  }
}
