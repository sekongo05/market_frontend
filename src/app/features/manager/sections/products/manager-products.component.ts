import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { MediaUrlPipe } from '../../../../shared/pipes/media-url.pipe';
import { ProductService } from '../../../../core/services/product.service';
import { CategoryService } from '../../../../core/services/category.service';
import { ProductMediaService } from '../../../../core/services/product-media.service';
import { ProductVariantService, ProductVariantRequest } from '../../../../core/services/product-variant.service';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { ScrollLockService } from '../../../../core/services/scroll-lock.service';
import { ManagerToastService } from '../../shared/manager-toast.service';
import { ProductResponse, GetProductsParams, ProductMediaItem, ProductVariant, Gender } from '../../../../core/models/product.models';
import { CategoryResponse } from '../../../../core/models/category.models';
import { PageResponse } from '../../../../core/models/common.models';

@Component({
  selector: 'app-manager-products',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, FormsModule, ReactiveFormsModule, MediaUrlPipe],
  templateUrl: './manager-products.component.html',
})
export class ManagerProductsComponent implements OnInit, OnDestroy {

  // ── Data ──────────────────────────────────────────────────────────────────
  products: ProductResponse[] = [];
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
  creationItems: { file: File; preview: string; colorName: string; colorHex: string; stock: number }[] = [];
  pendingCreationFile: File | null = null;
  pendingCreationPreview: string | null = null;
  pendingCreationColor = { colorName: '', colorHex: '#000000', stock: 0 };
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
  pendingMediaColor = { colorName: '', colorHex: '#000000', stock: 0 };
  mediaColorError: string | null = null;
  productVariants: ProductVariant[] = [];
  variantsLoading = false;
  variantSaving = false;
  variantError: string | null = null;
  newVariant: ProductVariantRequest = { colorName: '', colorHex: '#000000', imageUrl: '', stock: 0 };
  editingVariant: ProductVariant | null = null;
  newVariantFile: File | null = null;
  newVariantPreview: string | null = null;

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
    'rouge': '#FF0000', 'bleu': '#0000FF', 'vert': '#008000',
    'noir': '#000000', 'blanc': '#FFFFFF', 'jaune': '#FFD700',
    'orange': '#FF8C00', 'violet': '#800080', 'rose': '#FF69B4',
    'gris': '#808080', 'marron': '#8B4513', 'beige': '#F5F5DC',
    'or': '#D4AF37', 'argent': '#C0C0C0', 'turquoise': '#40E0D0',
    'bordeaux': '#800020', 'marine': '#001F5B', 'kaki': '#78866B',
  };

  private readonly CAT_MONTRES    = { id: 1, name: 'Montres',    slug: 'montres',    description: '', imageUrl: '', active: true, createdAt: '', updatedAt: '' };
  private readonly CAT_BAGUES     = { id: 2, name: 'Bagues',     slug: 'bagues',     description: '', imageUrl: '', active: true, createdAt: '', updatedAt: '' };
  private readonly CAT_COLLIERS   = { id: 3, name: 'Colliers',   slug: 'colliers',   description: '', imageUrl: '', active: true, createdAt: '', updatedAt: '' };
  private readonly CAT_CHAUSSURES = { id: 4, name: 'Chaussures', slug: 'chaussures', description: '', imageUrl: '', active: true, createdAt: '', updatedAt: '' };

  private readonly mockProducts: ProductResponse[] = [
    { id: 1, name: 'Rolex Submariner',    slug: 'rolex-submariner',    description: 'Montre automatique Rolex Submariner Date.',    price: 4200000, stock: 5,  gender: 'HOMME', imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80', category: this.CAT_MONTRES,    active: true, featured: false, createdAt: '', updatedAt: '' },
    { id: 2, name: 'Cartier Panthère',    slug: 'cartier-panthere',    description: 'Montre Cartier Panthère, boîtier or rose 25mm.', price: 5800000, stock: 3,  gender: 'FEMME', imageUrl: 'https://images.unsplash.com/photo-1461595383984-b56f78f9223f?w=400&q=80', category: this.CAT_MONTRES,    active: true, featured: false, createdAt: '', updatedAt: '' },
    { id: 3, name: 'Chevalière Or 18K',   slug: 'chevaliere-or-18k',   description: 'Chevalière homme en or jaune 18 carats.',       price: 650000,  stock: 10, gender: 'HOMME', imageUrl: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400&q=80', category: this.CAT_BAGUES,     active: true, featured: false, createdAt: '', updatedAt: '' },
    { id: 4, name: 'Solitaire Diamant',   slug: 'solitaire-diamant',   description: 'Bague solitaire or blanc 18K, diamant 0.50ct.', price: 1850000, stock: 6,  gender: 'FEMME', imageUrl: 'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=400&q=80', category: this.CAT_BAGUES,     active: true, featured: false, createdAt: '', updatedAt: '' },
    { id: 5, name: 'Chaîne Gourmette Or', slug: 'chaine-gourmette-or', description: 'Chaîne gourmette homme or jaune 18K.',         price: 780000,  stock: 10, gender: 'HOMME', imageUrl: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&q=80', category: this.CAT_COLLIERS,   active: true, featured: false, createdAt: '', updatedAt: '' },
    { id: 6, name: 'Derby Cuir Italiens',  slug: 'derby-cuir',          description: 'Derbies cuir veau grainé marron.',             price: 185000,  stock: 15, gender: 'HOMME', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80', category: this.CAT_CHAUSSURES, active: true, featured: false, createdAt: '', updatedAt: '' },
  ];

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
      debounceTime(400),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => this.loadProducts(0));

    this.wsService.staffEvent$.pipe(takeUntil(this.destroy$)).subscribe(event => {
      if (event.module === 'products')   this.loadProducts(0);
      if (event.module === 'categories') this.loadCategories();
      this.cdr.markForCheck();
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
          const pg = r.data as PageResponse<ProductResponse>;
          this.products   = pg.content.length > 0 ? pg.content : this._filteredMocks();
          this.totalPages = pg.content.length > 0 ? pg.totalPages : 1;
        } else {
          this.products = this._filteredMocks(); this.totalPages = 1;
        }
        this.currentPage = page;
        this._computeStats();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.products = this._filteredMocks(); this.totalPages = 1; this.currentPage = 0;
        this._computeStats(); this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  private loadCategories(): void {
    this.categoryService.getCategories().subscribe({
      next: (r) => {
        this.categories = (r.success && Array.isArray(r.data)) ? r.data : [this.CAT_MONTRES, this.CAT_BAGUES, this.CAT_COLLIERS, this.CAT_CHAUSSURES];
        this.cdr.markForCheck();
      },
      error: () => { this.categories = [this.CAT_MONTRES, this.CAT_BAGUES, this.CAT_COLLIERS, this.CAT_CHAUSSURES]; this.cdr.markForCheck(); },
    });
  }

  private _filteredMocks(): ProductResponse[] {
    if (!this.searchQuery) return this.mockProducts;
    const q = this.searchQuery.toLowerCase();
    return this.mockProducts.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
  }

  onSearchChange(value: string): void { this.searchQuery = value; this.searchSubject.next(value); }
  clearSearch(): void { this.searchQuery = ''; this.searchSubject.next(''); }
  search(): void { this.loadProducts(0); }
  previousPage(): void { if (this.currentPage > 0) this.loadProducts(this.currentPage - 1); }
  nextPage(): void { if (this.currentPage < this.totalPages - 1) this.loadProducts(this.currentPage + 1); }
  get pages(): number[] { return Array.from({ length: this.totalPages }, (_, i) => i); }

  // ── Inline stock ──────────────────────────────────────────────────────────

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

  startEditDiscount(product: ProductResponse): void {
    this.editingStockId = null;
    this.confirmDeleteId = null;
    this.discountEditingId = product.id;
    this.discountEditValue = product.discountPercent ?? 0;
    this.cdr.markForCheck();
  }

  confirmEditDiscount(product: ProductResponse): void {
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

  doDelete(product: ProductResponse): void {
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
    return !!(f.get('name')?.valid && f.get('description')?.valid && f.get('categoryId')?.value && f.get('gender')?.value);
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

  toggleVariants(): void {
    this.hasVariantsToggle = !this.hasVariantsToggle;
    this.creationItems = [];
    this.pendingCreationFile = null;
    this.pendingCreationPreview = null;
    this.pendingCreationColorError = null;
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
    this.pendingCreationColorError = null;
    this.pendingCreationColor = { colorName: '', colorHex: '#000000', stock: 0 };
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

  openEditDrawer(product: ProductResponse): void {
    this.editingProduct = product;
    this.drawerError = null;
    this.creationItems = []; this.pendingCreationFile = null; this.pendingCreationPreview = null; this.pendingCreationColorError = null;
    this.selectedVideo = null; this.videoPreview = null;
    this.imagePreview = product.imageUrl || null;
    this.selectedImageFile = null; this.uploadError = null;
    this.drawerTab = 'info';
    this.productMedia = product.media ?? [];
    this.productVariants = product.variants ?? [];
    this.variantError = null; this.editingVariant = null;
    this.newVariant = { colorName: '', colorHex: '#000000', imageUrl: '', stock: 0 };
    this.initForm(product);
    this.drawerOpen = true;
    this.scrollLock.lock();
    this.loadMedia(product.id);
    this.loadVariants(product.id);
    this.cdr.markForCheck();
    setTimeout(() => document.getElementById('manager-drawer-body')?.scrollTo(0, 0), 0);
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
    this.pendingCreationColor = { colorName: '', colorHex: '#000000', stock: 0 };
    this.selectedVideo = null; this.videoPreview = null;
    this.imagePreview = null; this.selectedImageFile = null; this.uploadError = null;
    this.drawerTab = 'info'; this.productMedia = []; this.productVariants = [];
    this.variantError = null; this.editingVariant = null;
    this.newVariant = { colorName: '', colorHex: '#000000', imageUrl: '', stock: 0 };
    this.newVariantFile = null; this.newVariantPreview = null;
    this.pendingMediaFile = null; this.pendingMediaPreview = null; this.mediaColorError = null;
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
    fd.append('stock', v.stock.toString());
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
    req$.subscribe({
      next: (r) => {
        if (r.success) {
          this.loadProducts(this.currentPage);
          if (wasCreating && r.data) {
            const product = r.data;
            this.editingProduct = product;
            this.initForm(product);
            this.drawerTab = 'media';
            if (itemsSnapshot.length === 0) {
              this.drawerLoading = false;
              this.productVariants = []; this.productMedia = [];
              this.toast.show('Produit créé avec succès ✓');
              if (wasNoVariant) this.closeDrawer();
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
                  colorName: item.colorName, colorHex: item.colorHex, imageUrl, stock: item.stock,
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
        this.products[idx] = { ...this.editingProduct, name: data.name, description: data.description, price: +data.price, stock: +data.stock, gender: data.gender, imageUrl: data.imageUrl, category };
      }
      this.toast.show('Produit mis à jour ✓');
    } else {
      const newId = Math.max(...this.products.map(p => p.id), 0) + 1;
      this.products = [{ id: newId, name: data.name, slug: data.name.toLowerCase().replace(/\s+/g, '-'), description: data.description, price: +data.price, stock: +data.stock, gender: data.gender, imageUrl: data.imageUrl, category, active: true, featured: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, ...this.products];
      this.toast.show('Produit ajouté ✓');
    }
    this._computeStats();
  }

  // ── Création : image + couleur ────────────────────────────────────────────

  onCreationColorNameChange(name: string): void {
    const hex = this.COLOR_MAP[name.toLowerCase().trim()];
    if (hex) this.pendingCreationColor.colorHex = hex;
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
    this.pendingCreationFile = null; this.pendingCreationPreview = null; this.pendingCreationColorError = null;
    this.cdr.markForCheck();
  }

  confirmCreationItem(): void {
    if (!this.pendingCreationFile) return;
    if (!this.pendingCreationColor.colorName.trim()) { this.pendingCreationColorError = 'Le nom de la couleur est requis'; return; }
    if (!/^#[0-9A-Fa-f]{6}$/.test(this.pendingCreationColor.colorHex)) { this.pendingCreationColorError = 'Code couleur invalide (ex: #FF5733)'; return; }
    this.creationItems = [...this.creationItems, {
      file: this.pendingCreationFile,
      preview: this.pendingCreationPreview!,
      colorName: this.pendingCreationColor.colorName.trim(),
      colorHex: this.pendingCreationColor.colorHex,
      stock: this.pendingCreationColor.stock || 0,
    }];
    this.productForm.patchValue({ stock: this.creationItems.reduce((s, i) => s + i.stock, 0) });
    this.pendingCreationFile = null; this.pendingCreationPreview = null; this.pendingCreationColorError = null;
    this.cdr.markForCheck();
  }

  removeCreationItem(index: number): void { this.creationItems = this.creationItems.filter((_, i) => i !== index); this.cdr.markForCheck(); }

  // ── Image / vidéo ─────────────────────────────────────────────────────────

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    this.selectedImageFile = file; this.uploadError = null;
    const reader = new FileReader();
    reader.onload = (e) => { this.imagePreview = e.target?.result as string; this.cdr.markForCheck(); };
    reader.readAsDataURL(file);
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
      next: (r) => { if (r.success) this.productMedia = r.data; this.mediaLoading = false; this.cdr.markForCheck(); },
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

  cancelPendingMedia(): void { this.pendingMediaFile = null; this.pendingMediaPreview = null; this.mediaColorError = null; this.cdr.markForCheck(); }

  confirmMediaUpload(): void {
    if (!this.pendingMediaFile || !this.editingProduct) return;
    if (!this.pendingMediaColor.colorName.trim()) { this.mediaColorError = 'Le nom de la couleur est requis'; return; }
    if (!/^#[0-9A-Fa-f]{6}$/.test(this.pendingMediaColor.colorHex)) { this.mediaColorError = 'Code couleur invalide (ex: #FF5733)'; return; }
    this.mediaColorError = null;
    this.mediaUploading = true;
    this.cdr.markForCheck();
    const file = this.pendingMediaFile;
    const color = { ...this.pendingMediaColor };
    this.pendingMediaFile = null; this.pendingMediaPreview = null;
    this.productMediaService.upload(this.editingProduct.id, file).subscribe({
      next: (r) => {
        if (r.success) {
          this.productMedia = [...this.productMedia, r.data];
          this.productVariantService.addVariant(this.editingProduct!.id, {
            colorName: color.colorName.trim(), colorHex: color.colorHex, imageUrl: r.data.url, stock: color.stock || 0,
          }).subscribe({
            next: (vr: any) => { if (vr.success) this.productVariants = [...this.productVariants, vr.data]; this.cdr.markForCheck(); },
            error: () => {},
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
      next: (r) => { if (r.success) this.productVariants = r.data; this.variantsLoading = false; this.cdr.markForCheck(); },
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

  saveVariant(): void {
    if (!this.editingProduct) return;
    if (!this.newVariant.colorName.trim()) { this.variantError = 'Le nom de la couleur est requis'; return; }
    if (!/^#[0-9A-Fa-f]{6}$/.test(this.newVariant.colorHex)) { this.variantError = 'Couleur hex invalide (ex: #FF5733)'; return; }
    this.variantSaving = true;
    this.variantError = null;

    const doSave = (imageUrl: string) => {
      const payload = { ...this.newVariant, imageUrl };
      const req$ = this.editingVariant
        ? this.productVariantService.updateVariant(this.editingProduct!.id, this.editingVariant.id, payload)
        : this.productVariantService.addVariant(this.editingProduct!.id, payload);
      req$.subscribe({
        next: (r) => {
          if (r.success) {
            this.productVariants = this.editingVariant
              ? this.productVariants.map(v => v.id === r.data.id ? r.data : v)
              : [...this.productVariants, r.data];
            this.editingVariant = null;
            this.newVariant = { colorName: '', colorHex: '#000000', imageUrl: '', stock: 0 };
            this.newVariantFile = null; this.newVariantPreview = null;
          }
          this.variantSaving = false;
          this.cdr.markForCheck();
        },
        error: (err) => { this.variantError = err?.error?.message || "Erreur lors de l'enregistrement"; this.variantSaving = false; this.cdr.markForCheck(); },
      });
    };

    if (this.newVariantFile) {
      this.productMediaService.upload(this.editingProduct.id, this.newVariantFile).subscribe({
        next: (r) => doSave(r.success ? r.data.url : (this.newVariant.imageUrl ?? '')),
        error: () => doSave(this.newVariant.imageUrl ?? ''),
      });
    } else {
      doSave(this.newVariant.imageUrl ?? '');
    }
  }

  startEditVariant(variant: ProductVariant): void {
    this.editingVariant = variant;
    this.newVariant = { colorName: variant.colorName, colorHex: variant.colorHex, imageUrl: variant.imageUrl || '', stock: variant.stock };
    this.newVariantFile = null; this.newVariantPreview = variant.imageUrl || null;
    this.cdr.markForCheck();
  }

  cancelEditVariant(): void {
    this.editingVariant = null;
    this.newVariant = { colorName: '', colorHex: '#000000', imageUrl: '', stock: 0 };
    this.newVariantFile = null; this.newVariantPreview = null; this.variantError = null;
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
