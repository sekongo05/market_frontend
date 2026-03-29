import { Component, OnInit, OnDestroy, ChangeDetectorRef, HostListener } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProductService } from '../../../core/services/product.service';
import { CategoryService } from '../../../core/services/category.service';
import { UploadService } from '../../../core/services/upload.service';
import { AuthService } from '../../../core/services/auth.service';
import { ProductMediaService } from '../../../core/services/product-media.service';
import { OrderService } from '../../../core/services/order.service';
import { PaymentService } from '../../../core/services/payment.service';
import { ProductResponse, GetProductsParams, ProductMediaItem, Gender } from '../../../core/models/product.models';
import { CategoryResponse } from '../../../core/models/category.models';
import { OrderResponse } from '../../../core/models/order.models';
import { PageResponse, OrderStatus } from '../../../core/models/common.models';

interface Toast { id: number; msg: string; type: 'success' | 'error'; }

@Component({
  selector: 'app-manager',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ReactiveFormsModule],
  templateUrl: './manager.component.html',
  styleUrls: ['./manager.component.css'],
})
export class ManagerComponent implements OnInit, OnDestroy {

  // ── Page tab ──────────────────────────────────────────────────────────────
  pageTab: 'products' | 'orders' | 'payments' = 'products';

  // ── Data ──────────────────────────────────────────────────────────────────
  products: ProductResponse[] = [];
  categories: CategoryResponse[] = [];
  loading = false;
  currentPage = 0;
  pageSize = 10;
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

  // ── Image upload ──────────────────────────────────────────────────────────
  imagePreview: string | null = null;
  uploadingImage = false;
  uploadError: string | null = null;
  dragOver = false;

  // ── Drawer tabs & media ───────────────────────────────────────────────────
  drawerTab: 'info' | 'media' = 'info';
  productMedia: ProductMediaItem[] = [];
  mediaLoading = false;
  mediaUploading = false;

  // ── Orders management ─────────────────────────────────────────────────────
  allOrders: OrderResponse[] = [];
  ordersLoading = false;
  ordersPage = 0;
  ordersTotalPages = 0;
  statusFilter: OrderStatus | '' = '';
  statusUpdatingId: number | null = null;
  readonly orderStatuses = Object.values(OrderStatus);
  readonly nextStatusMap: Record<string, OrderStatus | null> = {
    PENDING:    OrderStatus.CONFIRMED,
    CONFIRMED:  OrderStatus.PROCESSING,
    PROCESSING: OrderStatus.SHIPPED,
    SHIPPED:    OrderStatus.DELIVERED,
    DELIVERED:  null,
    CANCELLED:  null,
  };

  // ── Pending payments ──────────────────────────────────────────────────────
  pendingPayments: OrderResponse[] = [];
  paymentsLoading = false;
  paymentsPage = 0;
  paymentsTotalPages = 0;
  paymentActionId: number | null = null;

  // ── Inline stock edit ─────────────────────────────────────────────────────
  editingStockId: number | null = null;
  editingStockValue = 0;
  stockSavingId: number | null = null;

  // ── Inline delete confirm ─────────────────────────────────────────────────
  confirmDeleteId: number | null = null;

  // ── Toasts ────────────────────────────────────────────────────────────────
  toasts: Toast[] = [];
  private _toastId = 0;

  private readonly searchSubject = new Subject<string>();
  private readonly destroy$ = new Subject<void>();

  readonly genders: { value: Gender; label: string }[] = [
    { value: 'HOMME',  label: 'Homme'   },
    { value: 'FEMME',  label: 'Femme'   },
    { value: 'UNISEX', label: 'Unisexe' },
  ];

  // ── Fallback categories ───────────────────────────────────────────────────
  private readonly CAT_MONTRES    = { id: 1, name: 'Montres',    slug: 'montres',    description: '', imageUrl: '', active: true, createdAt: '', updatedAt: '' };
  private readonly CAT_BAGUES     = { id: 2, name: 'Bagues',     slug: 'bagues',     description: '', imageUrl: '', active: true, createdAt: '', updatedAt: '' };
  private readonly CAT_COLLIERS   = { id: 3, name: 'Colliers',   slug: 'colliers',   description: '', imageUrl: '', active: true, createdAt: '', updatedAt: '' };
  private readonly CAT_CHAUSSURES = { id: 4, name: 'Chaussures', slug: 'chaussures', description: '', imageUrl: '', active: true, createdAt: '', updatedAt: '' };

  private readonly mockProducts: ProductResponse[] = [
    { id: 1,  name: 'Rolex Submariner',    slug: 'rolex-submariner',    description: 'Montre automatique Rolex Submariner Date, boîtier Oystersteel 41mm.',        price: 4200000, stock: 5,  gender: 'HOMME', imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80', category: this.CAT_MONTRES,    active: true, createdAt: '', updatedAt: '' },
    { id: 2,  name: 'Cartier Panthère',    slug: 'cartier-panthere',    description: 'Montre Cartier Panthère, boîtier or rose 25mm, bracelet milanais.',           price: 5800000, stock: 3,  gender: 'FEMME', imageUrl: 'https://images.unsplash.com/photo-1461595383984-b56f78f9223f?w=400&q=80', category: this.CAT_MONTRES,    active: true, createdAt: '', updatedAt: '' },
    { id: 3,  name: 'Chevalière Or 18K',   slug: 'chevaliere-or-18k',   description: 'Chevalière homme en or jaune 18 carats, gravure personnalisable.',            price: 650000,  stock: 10, gender: 'HOMME', imageUrl: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400&q=80', category: this.CAT_BAGUES,     active: true, createdAt: '', updatedAt: '' },
    { id: 4,  name: 'Solitaire Diamant',   slug: 'solitaire-diamant',   description: 'Bague solitaire or blanc 18K, diamant 0.50ct certifié GIA.',                   price: 1850000, stock: 6,  gender: 'FEMME', imageUrl: 'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=400&q=80', category: this.CAT_BAGUES,     active: true, createdAt: '', updatedAt: '' },
    { id: 5,  name: 'Chaîne Gourmette Or', slug: 'chaine-gourmette-or', description: 'Chaîne gourmette homme or jaune 18K, maille cubaine, longueur 60cm.',          price: 780000,  stock: 10, gender: 'HOMME', imageUrl: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&q=80', category: this.CAT_COLLIERS,   active: true, createdAt: '', updatedAt: '' },
    { id: 6,  name: 'Sautoir Perles Akoya',slug: 'sautoir-perles',      description: 'Collier sautoir perles d\'Akoya naturelles, fermeture or blanc, 80cm.',        price: 1200000, stock: 4,  gender: 'FEMME', imageUrl: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&q=80', category: this.CAT_COLLIERS,   active: true, createdAt: '', updatedAt: '' },
    { id: 7,  name: 'Derby Cuir Italiens',  slug: 'derby-cuir',          description: 'Derbies cuir veau grainé marron, semelle cuir, fabrication artisanale.',        price: 185000,  stock: 15, gender: 'HOMME', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80', category: this.CAT_CHAUSSURES, active: true, createdAt: '', updatedAt: '' },
    { id: 8,  name: 'Escarpins Louboutin',  slug: 'escarpins-louboutin', description: 'Escarpins Christian Louboutin So Kate, talon aiguille 10cm, cuir vernis.',     price: 950000,  stock: 6,  gender: 'FEMME', imageUrl: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&q=80', category: this.CAT_CHAUSSURES, active: true, createdAt: '', updatedAt: '' },
  ];

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private uploadService: UploadService,
    private authService: AuthService,
    private productMediaService: ProductMediaService,
    private orderService: OrderService,
    private paymentService: PaymentService,
    private fb: FormBuilder,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.drawerOpen) this.closeDrawer();
    else if (this.editingStockId !== null) this.cancelEditStock();
    else if (this.confirmDeleteId !== null) this.cancelDelete();
  }

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (!user || (user.role !== 'MANAGER' && user.role !== 'ADMIN')) {
      this.router.navigate(['/']);
      return;
    }
    this.initForm();
    this.loadProducts();
    this.loadCategories();
    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => this.loadProducts(0));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get currentUser() { return this.authService.getCurrentUser(); }

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

  // ── Toasts ────────────────────────────────────────────────────────────────

  toast(msg: string, type: 'success' | 'error' = 'success'): void {
    const id = ++this._toastId;
    this.toasts = [...this.toasts, { id, msg, type }];
    this.cdr.detectChanges();
    setTimeout(() => this.dismissToast(id), 3500);
  }

  dismissToast(id: number): void {
    this.toasts = this.toasts.filter(t => t.id !== id);
    this.cdr.detectChanges();
  }

  // ── Drawer ────────────────────────────────────────────────────────────────

  private initForm(product?: ProductResponse): void {
    this.productForm = this.fb.group({
      name:        [product?.name           ?? '', Validators.required],
      description: [product?.description    ?? '', Validators.required],
      price:       [product?.price          ?? null, [Validators.required, Validators.min(1)]],
      stock:       [product?.stock          ?? null, [Validators.required, Validators.min(0)]],
      gender:      [product?.gender         ?? 'UNISEX', Validators.required],
      imageUrl:    [product?.imageUrl       ?? ''],
      categoryId:  [product?.category?.id  ?? null, Validators.required],
    });
  }

  openCreateDrawer(): void {
    this.editingProduct = null;
    this.drawerError = null;
    this.imagePreview = null;
    this.uploadError = null;
    this.drawerTab = 'info';
    this.productMedia = [];
    this.initForm();
    this.drawerOpen = true;
    this.cdr.detectChanges();
  }

  openEditDrawer(product: ProductResponse): void {
    this.editingProduct = product;
    this.drawerError = null;
    this.imagePreview = product.imageUrl || null;
    this.uploadError = null;
    this.drawerTab = 'info';
    this.productMedia = product.media ?? [];
    this.initForm(product);
    this.drawerOpen = true;
    this.loadMedia(product.id);
    this.cdr.detectChanges();
  }

  closeDrawer(): void {
    this.drawerOpen = false;
    this.editingProduct = null;
    this.drawerError = null;
    this.imagePreview = null;
    this.uploadError = null;
    this.uploadingImage = false;
    this.drawerTab = 'info';
    this.productMedia = [];
    this.cdr.detectChanges();
  }

  saveProduct(): void {
    if (this.productForm.invalid) return;
    this.drawerLoading = true;
    this.drawerError = null;
    const data = { ...this.productForm.value };
    if (!data.imageUrl) {
      data.imageUrl = 'https://placehold.co/600x400/1a1400/d4af37?text=' + encodeURIComponent(data.name || 'Produit');
    }
    const req$ = this.editingProduct
      ? this.productService.updateProduct(this.editingProduct.id, data)
      : this.productService.createProduct(data);
    req$.subscribe({
      next: (r) => {
        this.drawerLoading = false;
        if (r.success) {
          this.toast(this.editingProduct ? 'Produit mis à jour ✓' : 'Produit ajouté ✓');
          this.loadProducts(this.currentPage);
        } else {
          this._applyLocalSave(data);
        }
        this.closeDrawer();
        this.cdr.detectChanges();
      },
      error: () => {
        this.drawerLoading = false;
        this._applyLocalSave(data);
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
      this.toast('Produit mis à jour ✓');
    } else {
      const newId = Math.max(...this.products.map(p => p.id), 0) + 1;
      this.products = [{ id: newId, name: data.name, slug: data.name.toLowerCase().replace(/\s+/g, '-'), description: data.description, price: +data.price, stock: +data.stock, gender: data.gender, imageUrl: data.imageUrl, category, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, ...this.products];
      this.toast('Produit ajouté ✓');
    }
    this._computeStats();
  }

  // ── Inline stock ──────────────────────────────────────────────────────────

  startEditStock(product: ProductResponse): void {
    this.confirmDeleteId = null;
    this.editingStockId = product.id;
    this.editingStockValue = product.stock;
    this.cdr.detectChanges();
  }

  adjustStock(delta: number): void {
    this.editingStockValue = Math.max(0, (this.editingStockValue || 0) + delta);
    this.cdr.detectChanges();
  }

  confirmEditStock(product: ProductResponse): void {
    const newStock = Math.max(0, Math.round(+this.editingStockValue || 0));
    this.editingStockId = null;
    if (newStock === product.stock) { this.cdr.detectChanges(); return; }
    this.stockSavingId = product.id;
    const payload = { name: product.name, description: product.description, price: product.price, stock: newStock, gender: product.gender, imageUrl: product.imageUrl, categoryId: product.category.id };
    const applyLocally = () => {
      const idx = this.products.findIndex(p => p.id === product.id);
      if (idx !== -1) { this.products = [...this.products]; this.products[idx] = { ...this.products[idx], stock: newStock }; this._computeStats(); }
      this.toast(`Stock mis à jour : ${newStock}`);
      this.stockSavingId = null;
      this.cdr.detectChanges();
    };
    this.productService.updateProduct(product.id, payload).subscribe({ next: applyLocally, error: applyLocally });
  }

  cancelEditStock(): void { this.editingStockId = null; this.cdr.detectChanges(); }

  // ── Inline delete ─────────────────────────────────────────────────────────

  startDelete(id: number): void {
    this.editingStockId = null;
    this.confirmDeleteId = id;
    this.cdr.detectChanges();
  }

  doDelete(product: ProductResponse): void {
    this.confirmDeleteId = null;
    this.productService.deleteProduct(product.id).subscribe({
      next: (r) => {
        if (r.success) this.loadProducts(this.currentPage);
        else this._applyLocalDelete(product.id);
        this.toast(`"${product.name}" supprimé`);
        this.cdr.detectChanges();
      },
      error: () => { this._applyLocalDelete(product.id); this.toast(`"${product.name}" supprimé`); this.cdr.detectChanges(); },
    });
  }

  cancelDelete(): void { this.confirmDeleteId = null; this.cdr.detectChanges(); }

  private _applyLocalDelete(id: number): void {
    this.products = this.products.filter(p => p.id !== id);
    this._computeStats();
  }

  // ── Image upload ──────────────────────────────────────────────────────────

  onFileDrop(event: DragEvent): void {
    event.preventDefault(); this.dragOver = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) this._uploadFile(file);
  }
  onDragOver(event: DragEvent): void { event.preventDefault(); this.dragOver = true; this.cdr.detectChanges(); }
  onDragLeave(): void { this.dragOver = false; this.cdr.detectChanges(); }
  onFileSelected(event: Event): void {
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

  private _uploadFile(file: File): void {
    if (!this._isImageFile(file)) { this.uploadError = 'Format non supporté — JPEG, PNG, WEBP, GIF, BMP, TIFF, SVG, AVIF, HEIC'; this.cdr.detectChanges(); return; }
    if (file.size > 10 * 1024 * 1024) { this.uploadError = 'Fichier trop lourd — max 10 Mo'; this.cdr.detectChanges(); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      this.imagePreview = e.target?.result as string;
      this.productForm.patchValue({ imageUrl: this.imagePreview });
      this.uploadingImage = true;
      this.uploadError = null;
      this.cdr.detectChanges();
      this.uploadService.uploadProductImage(file).subscribe({
        next: (url) => { this.productForm.patchValue({ imageUrl: url }); this.imagePreview = url; this.uploadingImage = false; this.cdr.detectChanges(); },
        error: () => { this.uploadingImage = false; this.cdr.detectChanges(); },
      });
    };
    reader.readAsDataURL(file);
  }

  clearImage(): void { this.imagePreview = null; this.productForm.patchValue({ imageUrl: '' }); this.uploadError = null; this.cdr.detectChanges(); }

  onImageUrlInput(event: Event): void {
    const url = (event.target as HTMLInputElement).value.trim();
    this.imagePreview = url || null;
    this.cdr.detectChanges();
  }

  // ── Catalogue ─────────────────────────────────────────────────────────────

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
        this.loading = false; this.cdr.detectChanges();
      },
      error: () => {
        this.products = this._filteredMocks(); this.totalPages = 1; this.currentPage = 0;
        this._computeStats(); this.loading = false; this.cdr.detectChanges();
      },
    });
  }

  private loadCategories(): void {
    this.categoryService.getCategories().subscribe({
      next: (r) => {
        this.categories = (r.success && Array.isArray(r.data)) ? r.data : [this.CAT_MONTRES, this.CAT_BAGUES, this.CAT_COLLIERS, this.CAT_CHAUSSURES];
        this.cdr.detectChanges();
      },
      error: () => { this.categories = [this.CAT_MONTRES, this.CAT_BAGUES, this.CAT_COLLIERS, this.CAT_CHAUSSURES]; this.cdr.detectChanges(); },
    });
  }

  private _filteredMocks(): ProductResponse[] {
    if (!this.searchQuery) return this.mockProducts;
    const q = this.searchQuery.toLowerCase();
    return this.mockProducts.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
  }

  onSearchChange(value: string): void {
    this.searchQuery = value;
    this.searchSubject.next(value);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchSubject.next('');
  }

  search(): void { this.loadProducts(0); }
  previousPage(): void { if (this.currentPage > 0) this.loadProducts(this.currentPage - 1); }
  nextPage(): void { if (this.currentPage < this.totalPages - 1) this.loadProducts(this.currentPage + 1); }
  get pages(): number[] { return Array.from({ length: this.totalPages }, (_, i) => i); }

  setPageTab(tab: 'products' | 'orders' | 'payments'): void {
    this.pageTab = tab;
    if (tab === 'orders' && this.allOrders.length === 0) this.loadAllOrders();
    if (tab === 'payments' && this.pendingPayments.length === 0) this.loadPendingPayments();
    if (this.drawerOpen) this.closeDrawer();
    this.cdr.detectChanges();
  }

  // ── Orders management ─────────────────────────────────────────────────────

  loadAllOrders(page = 0): void {
    this.ordersLoading = true;
    const params: any = { page, size: 15 };
    if (this.statusFilter) params.status = this.statusFilter;
    this.orderService.getAllOrders(params).subscribe({
      next: (r) => {
        if (r.success) {
          const pg = r.data as PageResponse<OrderResponse>;
          this.allOrders = pg.content;
          this.ordersTotalPages = pg.totalPages;
          this.ordersPage = page;
        }
        this.ordersLoading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.ordersLoading = false; this.cdr.detectChanges(); },
    });
  }

  advanceOrderStatus(order: OrderResponse): void {
    const next = this.nextStatusMap[order.orderStatus];
    if (!next) return;
    this.statusUpdatingId = order.id;
    this.orderService.updateOrderStatus(order.id, next).subscribe({
      next: (r) => {
        if (r.success) {
          const idx = this.allOrders.findIndex(o => o.id === order.id);
          if (idx !== -1) { this.allOrders = [...this.allOrders]; this.allOrders[idx] = r.data; }
          this.toast(`Commande ${order.orderNumber} → ${this.orderStatusLabel(next)}`);
        }
        this.statusUpdatingId = null;
        this.cdr.detectChanges();
      },
      error: () => { this.statusUpdatingId = null; this.toast('Erreur de mise à jour', 'error'); this.cdr.detectChanges(); },
    });
  }

  cancelOrderByManager(order: OrderResponse): void {
    this.statusUpdatingId = order.id;
    this.orderService.cancelOrder(order.id).subscribe({
      next: (r) => {
        if (r.success) {
          const idx = this.allOrders.findIndex(o => o.id === order.id);
          if (idx !== -1) { this.allOrders = [...this.allOrders]; this.allOrders[idx] = r.data; }
          this.toast(`Commande ${order.orderNumber} annulée`);
        }
        this.statusUpdatingId = null;
        this.cdr.detectChanges();
      },
      error: () => { this.statusUpdatingId = null; this.toast('Erreur d\'annulation', 'error'); this.cdr.detectChanges(); },
    });
  }

  // ── Pending payment management ─────────────────────────────────────────────

  loadPendingPayments(page = 0): void {
    this.paymentsLoading = true;
    this.paymentService.getPendingValidationOrders(page, 15).subscribe({
      next: (r) => {
        if (r.success) {
          const pg = r.data as PageResponse<OrderResponse>;
          this.pendingPayments = pg.content;
          this.paymentsTotalPages = pg.totalPages;
          this.paymentsPage = page;
        }
        this.paymentsLoading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.paymentsLoading = false; this.cdr.detectChanges(); },
    });
  }

  validatePayment(order: OrderResponse): void {
    this.paymentActionId = order.id;
    this.paymentService.validatePayment(order.id).subscribe({
      next: (r) => {
        if (r.success) {
          this.pendingPayments = this.pendingPayments.filter(o => o.id !== order.id);
          this.toast(`Paiement validé — Commande ${order.orderNumber} confirmée ✓`);
        }
        this.paymentActionId = null;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.paymentActionId = null;
        this.toast(err?.error?.message || 'Erreur lors de la validation', 'error');
        this.cdr.detectChanges();
      },
    });
  }

  rejectPayment(order: OrderResponse): void {
    this.paymentActionId = order.id;
    this.paymentService.rejectPayment(order.id).subscribe({
      next: (r) => {
        if (r.success) {
          this.pendingPayments = this.pendingPayments.filter(o => o.id !== order.id);
          this.toast(`Paiement rejeté — Commande ${order.orderNumber}`);
        }
        this.paymentActionId = null;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.paymentActionId = null;
        this.toast(err?.error?.message || 'Erreur lors du rejet', 'error');
        this.cdr.detectChanges();
      },
    });
  }

  get paymentPages(): number[] { return Array.from({ length: this.paymentsTotalPages }, (_, i) => i); }

  orderStatusLabel(s: string): string {
    const m: Record<string, string> = {
      PENDING: 'En attente', CONFIRMED: 'Confirmée', PROCESSING: 'En traitement',
      SHIPPED: 'Expédiée', DELIVERED: 'Livrée', CANCELLED: 'Annulée',
    };
    return m[s] ?? s;
  }

  orderStatusClass(s: string): string {
    const m: Record<string, string> = {
      PENDING:    'bg-yellow-500/15 text-yellow-400 border border-yellow-500/25',
      CONFIRMED:  'bg-blue-500/15   text-blue-400   border border-blue-500/25',
      PROCESSING: 'bg-purple-500/15 text-purple-400 border border-purple-500/25',
      SHIPPED:    'bg-indigo-500/15 text-indigo-400 border border-indigo-500/25',
      DELIVERED:  'bg-green-500/15  text-green-400  border border-green-500/25',
      CANCELLED:  'bg-red-500/15    text-red-400    border border-red-500/25',
    };
    return m[s] ?? 'bg-white/10 theme-muted border border-white/10';
  }

  nextStatusLabel(s: string): string {
    const next = this.nextStatusMap[s];
    return next ? `→ ${this.orderStatusLabel(next)}` : '';
  }

  get orderPages(): number[] { return Array.from({ length: this.ordersTotalPages }, (_, i) => i); }

  // ── Media ──────────────────────────────────────────────────────────────────

  loadMedia(productId: number): void {
    this.mediaLoading = true;
    this.productMediaService.getAll(productId).subscribe({
      next: (r) => {
        if (r.success) this.productMedia = r.data;
        this.mediaLoading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.mediaLoading = false; this.cdr.detectChanges(); },
    });
  }

  onMediaSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file && this.editingProduct) this._uploadMedia(file);
    input.value = '';
  }

  private _uploadMedia(file: File): void {
    if (!this.editingProduct) return;
    this.mediaUploading = true;
    this.cdr.detectChanges();
    this.productMediaService.upload(this.editingProduct.id, file).subscribe({
      next: (r) => {
        if (r.success) this.productMedia = [...this.productMedia, r.data];
        this.mediaUploading = false;
        this.toast('Média ajouté ✓');
        this.cdr.detectChanges();
      },
      error: () => {
        this.mediaUploading = false;
        this.toast('Erreur d\'upload', 'error');
        this.cdr.detectChanges();
      },
    });
  }

  deleteMedia(mediaId: number): void {
    if (!this.editingProduct) return;
    this.productMediaService.delete(this.editingProduct.id, mediaId).subscribe({
      next: () => {
        this.productMedia = this.productMedia.filter(m => m.id !== mediaId);
        this.cdr.detectChanges();
      },
      error: () => this.toast('Erreur de suppression', 'error'),
    });
  }

  moveMedia(index: number, direction: 'up' | 'down'): void {
    if (!this.editingProduct) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= this.productMedia.length) return;
    const arr = [...this.productMedia];
    [arr[index], arr[newIndex]] = [arr[newIndex], arr[index]];
    this.productMedia = arr;
    this.cdr.detectChanges();
    this.productMediaService.reorder(this.editingProduct.id, arr.map(m => m.id)).subscribe({
      error: () => this.toast('Erreur de réorganisation', 'error'),
    });
  }
}
