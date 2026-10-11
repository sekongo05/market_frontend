import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
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
import { ProductResponse, ProductSummaryResponse, GetProductsParams, ProductMediaItem, ProductVariant, Gender, SortOption, ProductAttributeResponse } from '../../../../core/models/product.models';
import { CategoryResponse } from '../../../../core/models/category.models';
import { PageResponse } from '../../../../core/models/common.models';
import { SupplierResponse, ProductSupplierResponse } from '../../../../core/models/supplier.models';
import { stockClass } from '../../shared/admin-status.helpers';
import { compressImage } from '../../../../core/utils/image-compression.util';
import { PriceFormatDirective } from '../../../../shared/directives/price-format.directive';

@Component({
  selector: 'app-admin-products',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, PriceFormatDirective],
  templateUrl: './admin-products.component.html',
})
export class AdminProductsComponent implements OnInit, OnDestroy {
  products: ProductSummaryResponse[] = [];
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

  wizardStep: 1 | 2 = 1;
  hasVariantsToggle = false;
  creationItems: { file?: File; preview?: string; variantName: string; colorHex?: string; stock: number; attributeValueTempIds?: string[] }[] = [];
  bulkStockValue: number = 10;
  pendingCreationFile: File | null = null;
  pendingCreationPreview: string | null = null;
  pendingCreationColor = { variantName: '', colorHex: '#000000', stock: 0 };
  pendingCreationColorError: string | null = null;

  // ── Attributs temporaires (création) ──────────────────────────────────
  tempAttributes: { tempId: string; name: string; realId?: number; values: { tempId: string; value: string; colorHex?: string; realId?: number }[] }[] = [];
  selectedCreationAttrValueIds: string[] = [];
  editingTempAttr: { tempId: string; name: string; values: { tempId: string; value: string; colorHex?: string }[] } | null = null;

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
    private productMediaService: ProductMediaService,
    private productVariantService: ProductVariantService,
    private categoryService: CategoryService,
    private supplierService: SupplierService,
    private wsService: WebSocketService,
    private toast: AdminToastService,
    private scrollLock: ScrollLockService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router,
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

    this.wsService.stockUpdate$.pipe(takeUntil(this.destroy$)).subscribe(update => {
      const idx = this.products.findIndex(p => p.id === update.productId);
      if (idx !== -1) {
        this.products = [...this.products];
        this.products[idx] = { ...this.products[idx], stock: update.stock };
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

  isNewProduct(p: ProductSummaryResponse): boolean {
    return (Date.now() - new Date(p.createdAt).getTime()) / 86_400_000 < 7;
  }

  isLowStock(p: ProductSummaryResponse): boolean {
    return p.stock > 0 && p.stock <= 3;
  }
  get isStep1Valid(): boolean {
    const f = this.productForm;
    return !!(
      f.get('name')?.valid && f.get('description')?.valid &&
      f.get('categoryId')?.value && f.get('gender')?.value &&
      f.get('price')?.valid &&
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
          const pg = r.data as PageResponse<ProductSummaryResponse>;
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

  openEditDrawer(product: ProductSummaryResponse): void {
    this.drawerLoading = true;
    this.productService.getProductBySlug(product.slug).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        if (r.success && r.data) {
          this.editingProduct = r.data;
          this._resetDrawer();
          this.imagePreview = r.data.imageUrl || null;
          this.productMedia = r.data.media ?? [];
          this.productVariants = r.data.variants ?? [];
          this.productAttributes = r.data.attributes ?? [];
          this.initProductForm(r.data);
          this.drawerOpen = true;
          this.scrollLock.lock();
          this.loadMedia(r.data.id);
          this.loadVariants(r.data.id);
          this.loadAttributes(r.data.id);
          this.loadProductSuppliers(r.data.id);
          this.loadAllSuppliers();
        }
        this.drawerLoading = false;
        this.cdr.markForCheck();
        setTimeout(() => document.getElementById('admin-drawer-panel')?.scrollTo(0, 0), 0);
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
    document.getElementById('admin-drawer-panel')?.scrollTo(0, 0);
  }

  closeDrawer(): void {
    this.drawerOpen = false;
    this.editingProduct = null;
    this._resetDrawer();
    this.scrollLock.unlock();
    if (this.route.snapshot.queryParams['edit']) {
      this.router.navigate([], { relativeTo: this.route, queryParams: { edit: null }, queryParamsHandling: 'merge', replaceUrl: true });
    }
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
    this.tempAttributes = [];
    this.selectedCreationAttrValueIds = [];
    this.editingTempAttr = null;
    this.selectedVideo = null;
    this.videoPreview = null;
    this.imagePreview = null;
    this.selectedImageFile = null;
    this.uploadError = null;
    this.drawerTab = 'info';
    this.productMedia = [];
    this.productVariants = [];
    this.productAttributes = [];
    this.attributesLoading = false;
    this.attributeSaving = false;
    this.attributeError = null;
    this.addAttributeOpen = false;
    this.newAttributeName = '';
    this.editingAttribute = null;
    this.newValueInputs = [];
    this.variantError = null;
    this.editingVariant = null;
    this.newVariant = { variantName: '', colorHex: '#000000', imageUrl: '', stock: 0 };
    this.variantFormAttributes = {};
    this.variantAttributeValueIds = [];
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
      if (this.selectedImageFile) {
        fd.append('images', this.selectedImageFile);
      } else if (this.creationItems.length > 0 && this.creationItems[0].file) {
        fd.append('images', this.creationItems[0].file);
      }
      if (this.selectedVideo) fd.append('video', this.selectedVideo);
      req$ = this.productService.createProduct(fd);
    }

    const wasCreating = !this.editingProduct;
    const itemsSnapshot = [...this.creationItems];
    const tempAttrSnapshot = [...this.tempAttributes];
    const selectedAttrVals = [...this.selectedCreationAttrValueIds];
    req$.subscribe({
      next: (r) => {
        this.loadProducts(this.productsPage);
        if (wasCreating && r.data) {
          const product = r.data;
          this.editingProduct = product;
          this.initProductForm(product);
          this.drawerTab = 'media';

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
                  // Mapper tempIds → vrais IDs
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
            if (item.file) {
              this.productMediaService.upload(product.id, item.file).subscribe({
                next: (mr) => createVariant(mr.success ? mr.data.url : (product.imageUrl || '')),
                error: () => createVariant(product.imageUrl || ''),
              });
            } else {
              createVariant(product.imageUrl || '');
            }
          };

          if (itemsSnapshot.length === 0 && tempAttrSnapshot.length === 0) {
            this.drawerLoading = false;
            this.productVariants = [];
            this.productMedia = [];
            this.toast.show('Produit créé ✓');
            this.cdr.markForCheck();
            return;
          }
          if (tempAttrSnapshot.length > 0) {
            saveAttrs(() => processItem(0));
          } else {
            processItem(0);
          }
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

  doDelete(product: ProductSummaryResponse): void {
    this.confirmDeleteId = null;
    this.productService.deleteProduct(product.id).subscribe({
      next: () => { this.loadProducts(this.productsPage); this.toast.show(`"${product.name}" supprimé`); this.cdr.markForCheck(); },
      error: (err) => { this.toast.show(err?.error?.message || 'Erreur de suppression', 'error'); this.cdr.markForCheck(); },
    });
  }

  startEditDiscount(product: ProductSummaryResponse): void {
    this.discountEditingId = product.id;
    this.discountEditValue = product.discountPercent ?? 0;
    this.cdr.markForCheck();
  }

  confirmEditDiscount(product: ProductSummaryResponse): void {
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

  toggleProductActive(product: ProductSummaryResponse): void {
    this.toggleActivatingId = product.id;
    this.productService.toggleActive(product.id).subscribe({
      next: (r) => {
        if (r.success) {
          const idx = this.products.findIndex(p => p.id === product.id);
          if (idx !== -1) { this.products = [...this.products]; this.products[idx] = { ...this.products[idx], active: r.data.active }; }
          this.toast.show(`"${product.name}" ${r.data.active ? 'activé' : 'désactivé'}`);
        }
        this.toggleActivatingId = null;
        this.cdr.markForCheck();
      },
      error: () => { this.toggleActivatingId = null; this.cdr.markForCheck(); },
    });
  }

  toggleProductFeatured(product: ProductSummaryResponse): void {
    this.toggleFeaturedId = product.id;
    this.productService.toggleFeatured(product.id).subscribe({
      next: (r) => {
        if (r.success) {
          const idx = this.products.findIndex(p => p.id === product.id);
          if (idx !== -1) { this.products = [...this.products]; this.products[idx] = { ...this.products[idx], featured: r.data.featured }; }
          this.toast.show(`"${product.name}" ${r.data.featured ? 'en vedette ⭐' : 'retiré des vedettes'}`);
        }
        this.toggleFeaturedId = null;
        this.cdr.markForCheck();
      },
      error: () => { this.toggleFeaturedId = null; this.cdr.markForCheck(); },
    });
  }

  startEditPrice(product: ProductSummaryResponse): void {
    this.priceEditingId = product.id;
    this.priceEditValue = product.price;
    this.cdr.markForCheck();
  }

  confirmEditPrice(product: ProductSummaryResponse): void {
    const newPrice = Math.max(1, Math.round(+this.priceEditValue || 1));
    this.priceEditingId = null;
    if (newPrice === product.price) { this.cdr.markForCheck(); return; }
    this.priceSavingId = product.id;
    const fd = new FormData();
    fd.append('name', product.name);
    fd.append('price', newPrice.toString());
    fd.append('stock', product.stock.toString());
    fd.append('gender', product.gender);
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

  openAddAttribute(): void {
    this.editingAttribute = null;
    this.newAttributeName = '';
    this.newValueInputs = [{ value: '', colorHex: '#000000' }];
    this.attributeError = null;
    this.addAttributeOpen = true;
    this.cdr.markForCheck();
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
    this.generateCreationVariantsFromAttributes();
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

  resolveColorHex(val: string): string | null {
    if (!val) return null;
    const trimmed = val.trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(trimmed)) return trimmed.toUpperCase();
    const lower = trimmed.toLowerCase();
    const normalized = lower.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    return this.COLOR_MAP[lower] || this.COLOR_MAP[normalized] || null;
  }

  onAttributeValueChange(index: number, val: string): void {
    const item = this.newValueInputs[index];
    if (!item) return;
    item.value = val;
    const detected = this.resolveColorHex(val);
    if (detected) {
      item.colorHex = detected;
    }
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
    const isColorAttribute = /couleur|color|cadran|teinte|finition/i.test(this.newAttributeName);
    const values = this.newValueInputs
      .filter(v => v.value.trim())
      .map(v => {
        const detected = this.resolveColorHex(v.value);
        const hex = detected || (v.colorHex && v.colorHex !== '#000000' ? v.colorHex : (isColorAttribute && v.colorHex ? v.colorHex : undefined));
        return {
          value: v.value.trim(),
          colorHex: hex,
        };
      });

    if (!this.editingProduct) {
      // Mode création : stocker en local
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
      this.generateCreationVariantsFromAttributes();
      this.cancelAttributeForm();
      this.cdr.markForCheck();
      return;
    }

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
            if (this.editingVariant) {
              this.productVariants = this.productVariants.map(v => v.id === r.data.id ? r.data : v);
            } else {
              this.productVariants = [...this.productVariants, r.data];
            }
            this.cancelEditVariant();
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
    this.newVariantFile = null;
    this.newVariantPreview = variant.imageUrl || null;
    this.variantError = null;
    this.cdr.markForCheck();
  }

  cancelEditVariant(): void {
    this.editingVariant = null;
    this.newVariant = { variantName: '', colorHex: '#000000', imageUrl: '', stock: 0 };
    this.variantFormAttributes = {};
    this.variantAttributeValueIds = [];
    this.newVariantFile = null;
    this.newVariantPreview = null;
    this.variantError = null;
    this.cdr.markForCheck();
  }

  async onVariantImageSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      const { file: compressed, preview } = await compressImage(file);
      this.newVariantFile = compressed;
      this.newVariantPreview = preview;
    } catch {
      this.newVariantFile = file;
      const reader = new FileReader();
      reader.onload = (e) => { this.newVariantPreview = e.target?.result as string; this.cdr.markForCheck(); };
      reader.readAsDataURL(file);
    }
    this.cdr.markForCheck();
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

  
  async onVariantRowFileSelected(event: Event, index: number): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !this.creationItems[index]) return;
    try {
      const { file: compressed, preview } = await compressImage(file);
      this.creationItems[index].file = compressed;
      this.creationItems[index].preview = preview;
    } catch {
      this.creationItems[index].file = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        this.creationItems[index].preview = e.target?.result as string;
        this.cdr.markForCheck();
      };
      reader.readAsDataURL(file);
    }
    this.cdr.markForCheck();
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
    this.pendingCreationFile = null;
    this.pendingCreationPreview = null;
    this.pendingCreationColorError = null;
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
      ['name', 'description', 'categoryId', 'gender', 'price', 'costPrice'].forEach(f => this.productForm.get(f)?.markAsTouched());
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

  
  
  generateCreationVariantsFromAttributes(): void {
    if (this.tempAttributes.length === 0) {
      this.creationItems = [];
      this.updateTotalStockFromVariants();
      this.cdr.markForCheck();
      return;
    }

    const cartesian = (arrays: any[][]): any[][] => {
      return arrays.reduce((acc, curr) => {
        return acc.flatMap(a => curr.map(c => [...a, c]));
      }, [[]]);
    };

    const attributeValueArrays = this.tempAttributes.map(attr =>
      attr.values.map(val => ({
        attrName: attr.name,
        valueTempId: val.tempId,
        value: val.value,
        colorHex: val.colorHex,
      }))
    );

    const combinations = cartesian(attributeValueArrays);

    this.creationItems = combinations.map(comb => {
      const variantName = comb.map(c => c.value).join(' / ');
      const colorVal = comb.find(c => c.colorHex);
      const detectedHex = colorVal?.colorHex || comb.map(c => this.resolveColorHex(c.value)).find(Boolean) || '';
      const attrTempIds = comb.map(c => c.valueTempId);
      return {
        variantName,
        colorHex: detectedHex,
        stock: this.bulkStockValue != null ? this.bulkStockValue : 10,
        attributeValueTempIds: attrTempIds,
      };
    });

    this.updateTotalStockFromVariants();
    this.cdr.markForCheck();
  }

  updateVariantRowColor(index: number, newHex: string): void {
    if (this.creationItems[index]) {
      this.creationItems[index].colorHex = newHex.toUpperCase();
      this.cdr.markForCheck();
    }
  }

  applyBulkStock(): void {
    const s = Math.max(0, this.bulkStockValue || 0);
    this.creationItems.forEach(item => item.stock = s);
    this.updateTotalStockFromVariants();
    this.cdr.markForCheck();
  }

  updateTotalStockFromVariants(): void {
    const total = this.creationItems.reduce((acc, i) => acc + (i.stock || 0), 0);
    this.productForm.patchValue({ stock: total });
    this.cdr.markForCheck();
  }

  clearVariantRowImage(index: number): void {
    if (this.creationItems[index]) {
      this.creationItems[index].file = undefined;
      this.creationItems[index].preview = undefined;
      this.cdr.markForCheck();
    }
  }

  loadCategoryDefaultAttributes(): void {
    const catId = this.productForm?.get('categoryId')?.value;
    if (!catId) return;
    const cat = this.productCategories.find(c => c.id === +catId);
    if (!cat?.defaultAttributes) return;

    try {
      const raw = JSON.parse(cat.defaultAttributes);
      if (Array.isArray(raw) && raw.length > 0) {
        this.tempAttributes = raw.map((a: any) => ({
          tempId: crypto.randomUUID(),
          name: a.name || '',
          values: (a.values || []).map((v: any) => {
            const valName = typeof v === 'string' ? v : (v.name || '');
            const hex = typeof v === 'object' && v.hex ? v.hex : undefined;
            return {
              tempId: crypto.randomUUID(),
              value: valName,
              colorHex: hex,
            };
          }),
        }));
        this.hasVariantsToggle = true;
        this.generateCreationVariantsFromAttributes();
        this.toast.show(`Déclinaisons générées depuis "${cat.name}" ✓`);
      }
    } catch (e) {
      // Ignorer
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
    this.loadCategoryDefaultAttributes();
    this.cdr.markForCheck();
  }

  toggleVariants(): void {
    this.hasVariantsToggle = !this.hasVariantsToggle;
    this.creationItems = [];
    this.pendingCreationFile = null;
    this.pendingCreationPreview = null;
    this.pendingCreationColorError = null;
    if (!this.hasVariantsToggle) {
      this.productForm.patchValue({ stock: null });
    } else if (this.tempAttributes.length === 0 && !this.editingProduct) {
      this.loadCategoryDefaultAttributes();
    }
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
