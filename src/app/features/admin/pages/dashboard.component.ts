import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { interval, Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  DashboardService, DashboardStats, MonthlyRevenueItem, TopProductItem, DailyCaisseResponse
} from '../../../core/services/dashboard.service';
import { UserService } from '../../../core/services/user.service';
import { CategoryService } from '../../../core/services/category.service';
import { OrderService } from '../../../core/services/order.service';
import { ProductService } from '../../../core/services/product.service';
import { ProductMediaService } from '../../../core/services/product-media.service';
import { DeliveryService } from '../../../core/services/delivery.service';
import { PromoService } from '../../../core/services/promo.service';
import { ReviewService } from '../../../core/services/review.service';
import { ReturnService } from '../../../core/services/return.service';
import { UserResponse, AdminCreateUserRequest, UserFullProfileResponse } from '../../../core/models/user.models';
import { CategoryResponse } from '../../../core/models/category.models';
import { OrderResponse, GetOrdersParams } from '../../../core/models/order.models';
import { ProductResponse, GetProductsParams, ProductMediaItem, Gender } from '../../../core/models/product.models';
import { DeliveryResponse, AddDeliveryEventRequest, UpdateDeliveryRequest } from '../../../core/models/delivery.models';
import { PromoResponse, CreatePromoRequest, PublicPromoResponse } from '../../../core/models/promo.models';
import { ReviewResponse } from '../../../core/models/review.models';
import { ReturnResponse, ReturnDecisionRequest } from '../../../core/models/return.models';
import { UserRole, PageResponse, OrderStatus, DeliveryStatus } from '../../../core/models/common.models';
import { TooltipDirective } from '../../../shared/directives/tooltip.directive';
import { ScrollLockService } from '../../../core/services/scroll-lock.service';

export interface Insight {
  type: 'success' | 'warning' | 'danger' | 'info' | 'action';
  icon: string;
  message: string;
  detail?: string;
}

interface Toast { id: number; msg: string; type: 'success' | 'error'; }

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TooltipDirective],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class AdminDashboardComponent implements OnInit, OnDestroy {

  // ── Tabs ───────────────────────────────────────────────────────────────────
  activeTab: 'stats' | 'orders' | 'products' | 'delivery' | 'users' | 'categories' | 'promos' | 'reviews' | 'returns' = 'stats';

  // ── Stats ──────────────────────────────────────────────────────────────────
  stats: DashboardStats | null = null;
  loading = false;
  error: string | null = null;
  lastRefreshed: Date | null = null;
  private refreshSub?: Subscription;
  monthlyRevenue: MonthlyRevenueItem[] = [];
  topProducts: TopProductItem[] = [];
  selectedYear: number = new Date().getFullYear();
  chartsLoading = false;
  hoveredMonthIndex: number | null = null;

  // ── Toasts ─────────────────────────────────────────────────────────────────
  toasts: Toast[] = [];
  private _toastId = 0;

  // ── Orders ─────────────────────────────────────────────────────────────────
  allOrders: OrderResponse[] = [];
  ordersLoading = false;
  ordersPage = 0;
  ordersTotalPages = 0;
  statusFilter: OrderStatus | '' = '';
  statusUpdatingId: number | null = null;
  readonly orderStatuses = Object.values(OrderStatus);
  readonly nextStatusMap: Record<string, OrderStatus | null> = {
    PENDING:   OrderStatus.CONFIRMED,
    CONFIRMED: OrderStatus.SHIPPED,
    SHIPPED:   OrderStatus.DELIVERED,
    DELIVERED: null,
    CANCELLED: null,
  };

  // ── Products ───────────────────────────────────────────────────────────────
  products: ProductResponse[] = [];
  productsLoading = false;
  productsPage = 0;
  productsTotalPages = 0;
  productSearchQuery = '';
  drawerOpen = false;
  editingProduct: ProductResponse | null = null;
  drawerLoading = false;
  drawerError: string | null = null;
  productForm!: FormGroup;
  drawerTab: 'info' | 'media' = 'info';
  productMedia: ProductMediaItem[] = [];
  mediaLoading = false;
  mediaUploading = false;
  selectedImages: File[] = [];
  imagePreviews: string[] = [];
  selectedVideo: File | null = null;
  videoPreview: string | null = null;
  imagePreview: string | null = null;
  selectedImageFile: File | null = null;
  uploadError: string | null = null;
  dragOver = false;
  editingStockId: number | null = null;
  editingStockValue = 0;
  stockSavingId: number | null = null;
  confirmDeleteId: number | null = null;
  productCategories: CategoryResponse[] = [];
  readonly genders: { value: Gender; label: string }[] = [
    { value: 'HOMME',  label: 'Homme'   },
    { value: 'FEMME',  label: 'Femme'   },
    { value: 'UNISEX', label: 'Unisexe' },
  ];

  // ── Delivery ───────────────────────────────────────────────────────────────
  deliveryOrders: OrderResponse[] = [];
  deliveryOrdersLoading = false;
  deliveryOrdersPage = 0;
  deliveryOrdersTotalPages = 0;
  expandedDeliveryOrderId: number | null = null;
  selectedDelivery: DeliveryResponse | null = null;
  deliveryDetailLoading = false;
  deliveryEventStatus: DeliveryStatus = DeliveryStatus.OUT_FOR_DELIVERY;
  deliveryEventDesc = '';
  deliveryEventLocation = '';
  deliveryEventSaving = false;
  deliveryUpdateAgent = '';
  deliveryUpdateDate = '';
  deliveryUpdateNotes = '';
  deliveryUpdateCarrier = '';
  deliveryUpdateCarrierUrl = '';
  deliveryUpdateSaving = false;
  deliverySubTab: 'events' | 'update' = 'events';
  readonly deliveryStatuses = Object.values(DeliveryStatus);

  // ── Users ──────────────────────────────────────────────────────────────────
  users: UserResponse[] = [];
  usersLoading = false;
  usersPage = 0;
  usersTotalPages = 0;
  toggleUpdatingId: number | null = null;
  readonly roles = Object.values(UserRole);
  showCreateUserModal = false;
  createUserLoading = false;
  createUserError: string | null = null;
  createUserForm: AdminCreateUserRequest = {
    nom: '', prenom: '', email: '', password: '', phone: '+225', role: UserRole.CUSTOMER
  };

  // ── Categories ─────────────────────────────────────────────────────────────
  categories: CategoryResponse[] = [];
  categoriesLoading = false;
  categoryToggleId: number | null = null;
  showCategoryForm = false;
  editingCategory: CategoryResponse | null = null;
  categoryForm = { name: '', description: '', imageUrl: '' };
  categoryFormLoading = false;
  categoryFormError: string | null = null;

  // ── Users — Fiche complète ─────────────────────────────────────────────────
  userFullProfile: UserFullProfileResponse | null = null;
  userFullProfileLoading = false;
  showUserProfile = false;

  // ── Caisse journalière ─────────────────────────────────────────────────────
  dailyCaisse: DailyCaisseResponse | null = null;
  dailyCaisseLoading = false;
  caisseDate = new Date().toISOString().split('T')[0];

  // ── Codes promo ────────────────────────────────────────────────────────────
  promos: PromoResponse[] = [];
  promosLoading = false;
  showPromoForm = false;
  promoForm: CreatePromoRequest = { code: '', discountPercent: 10, publicVisible: false };
  promoFormLoading = false;
  promoFormError: string | null = null;

  // ── Avis & notations ───────────────────────────────────────────────────────
  reviews: ReviewResponse[] = [];
  reviewsLoading = false;
  reviewsPage = 0;
  reviewsTotalPages = 0;

  // ── Retours ────────────────────────────────────────────────────────────────
  returns: ReturnResponse[] = [];
  returnsLoading = false;
  returnsPage = 0;
  returnsTotalPages = 0;
  returnDecisionId: number | null = null;
  returnDecisionModal = false;
  returnDecisionItem: ReturnResponse | null = null;
  returnDecision: 'APPROVED' | 'REJECTED' | 'COMPLETED' = 'APPROVED';
  returnDecisionNote = '';
  returnDecisionLoading = false;

  private readonly searchSubject = new Subject<string>();
  private readonly destroy$ = new Subject<void>();

  constructor(
    private dashboardService: DashboardService,
    private userService: UserService,
    private categoryService: CategoryService,
    private orderService: OrderService,
    private productService: ProductService,
    private productMediaService: ProductMediaService,
    private deliveryService: DeliveryService,
    private promoService: PromoService,
    private reviewService: ReviewService,
    private returnService: ReturnService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private scrollLock: ScrollLockService,
  ) {}

  ngOnInit(): void {
    this.loadStats();
    this.refreshSub = interval(60_000).subscribe(() => this.loadStats());
    this.initProductForm();
    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => this.loadProducts(0));
  }

  ngOnDestroy(): void {
    this.scrollLock.forceUnlock();
    this.refreshSub?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

  setTab(tab: typeof this.activeTab): void {
    this.activeTab = tab;
    if (tab === 'orders'   && this.allOrders.length === 0)      this.loadAllOrders();
    if (tab === 'products' && this.products.length === 0)        { this.loadProducts(); this.loadProductCategories(); }
    if (tab === 'delivery' && this.deliveryOrders.length === 0)  this.loadDeliveryOrders();
    if (tab === 'users'    && this.users.length === 0)           this.loadUsers();
    if (tab === 'categories' && this.categories.length === 0)    this.loadCategories();
    if (tab === 'promos'   && this.promos.length === 0)          this.loadPromos();
    if (tab === 'reviews'  && this.reviews.length === 0)         this.loadReviews();
    if (tab === 'returns'  && this.returns.length === 0)         this.loadReturns();
    this.cdr.detectChanges();
  }

  // ── Toast ──────────────────────────────────────────────────────────────────

  toast(msg: string, type: 'success' | 'error' = 'success'): void {
    const id = ++this._toastId;
    this.toasts = [...this.toasts, { id, msg, type }];
    this.cdr.detectChanges();
    setTimeout(() => { this.toasts = this.toasts.filter(t => t.id !== id); this.cdr.detectChanges(); }, 3500);
  }

  // ── Stats ──────────────────────────────────────────────────────────────────

  loadStats(): void {
    this.loading = true;
    this.error = null;
    this.dashboardService.getStats().subscribe({
      next: (r) => {
        if (r.success) { this.stats = r.data; this.lastRefreshed = new Date(); }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.error = 'Erreur lors du chargement des statistiques'; this.loading = false; this.cdr.detectChanges(); },
    });
    this.loadCharts();
  }

  loadCharts(): void {
    this.chartsLoading = true;
    this.dashboardService.getMonthlyRevenue(this.selectedYear).subscribe({
      next: (r) => { if (r.success) this.monthlyRevenue = r.data; this.cdr.detectChanges(); },
      error: () => this.cdr.detectChanges(),
    });
    this.dashboardService.getTopProducts(6).subscribe({
      next: (r) => { if (r.success) this.topProducts = r.data; this.chartsLoading = false; this.cdr.detectChanges(); },
      error: () => { this.chartsLoading = false; this.cdr.detectChanges(); },
    });
  }

  changeYear(delta: number): void {
    this.selectedYear += delta;
    this.dashboardService.getMonthlyRevenue(this.selectedYear).subscribe({
      next: (r) => { if (r.success) this.monthlyRevenue = r.data; this.cdr.detectChanges(); },
      error: () => this.cdr.detectChanges(),
    });
  }

  // ── Orders ─────────────────────────────────────────────────────────────────

  loadAllOrders(page = 0): void {
    this.ordersLoading = true;
    const params: GetOrdersParams = { page, size: 15 };
    if (this.statusFilter) params.status = this.statusFilter as OrderStatus;
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
    const req$ = order.orderStatus === 'PENDING'
      ? this.orderService.validateOrder(order.id)
      : this.orderService.updateOrderStatus(order.id, next);
    req$.subscribe({
      next: (r) => {
        if (r.success) {
          const idx = this.allOrders.findIndex(o => o.id === order.id);
          if (idx !== -1) { this.allOrders = [...this.allOrders]; this.allOrders[idx] = r.data; }
          this.toast(`Commande ${order.orderNumber} → ${this.orderStatusLabel(next)}`);
        }
        this.statusUpdatingId = null;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.statusUpdatingId = null;
        this.toast(err?.error?.message || 'Erreur de mise à jour', 'error');
        this.cdr.detectChanges();
      },
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

  orderStatusLabel(s: string): string {
    const m: Record<string, string> = {
      PENDING:   'En attente',
      CONFIRMED: 'Confirmée',
      SHIPPED:   'Expédiée',
      DELIVERED: 'Livrée',
      CANCELLED: 'Annulée',
    };
    return m[s] ?? s;
  }

  orderStatusClass(s: string): string {
    const m: Record<string, string> = {
      PENDING:   'bg-yellow-500/15 text-yellow-400 border border-yellow-500/25',
      CONFIRMED: 'bg-blue-500/15   text-blue-400   border border-blue-500/25',
      SHIPPED:   'bg-orange-500/15 text-orange-400 border border-orange-500/25',
      DELIVERED: 'bg-green-500/15  text-green-400  border border-green-500/25',
      CANCELLED: 'bg-red-500/15    text-red-400    border border-red-500/25',
    };
    return m[s] ?? 'bg-white/10 theme-muted border border-white/10';
  }

  nextStatusLabel(s: string): string {
    const next = this.nextStatusMap[s];
    return next ? `→ ${this.orderStatusLabel(next)}` : '';
  }

  get orderPages(): number[] { return Array.from({ length: this.ordersTotalPages }, (_, i) => i); }

  // ── Products ───────────────────────────────────────────────────────────────

  private initProductForm(product?: ProductResponse): void {
    this.productForm = this.fb.group({
      name:        [product?.name          ?? '', Validators.required],
      description: [product?.description   ?? '', Validators.required],
      price:       [product?.price         ?? null, [Validators.required, Validators.min(1)]],
      stock:       [product?.stock         ?? null, [Validators.required, Validators.min(0)]],
      gender:      [product?.gender        ?? 'UNISEX', Validators.required],
      categoryId:  [product?.category?.id  ?? null, Validators.required],
    });
  }

  loadProducts(page = 0): void {
    this.productsLoading = true;
    const params: GetProductsParams = { page, size: 12 };
    if (this.productSearchQuery) params.search = this.productSearchQuery;
    this.productService.getProducts(params).subscribe({
      next: (r) => {
        if (r.success) {
          const pg = r.data as PageResponse<ProductResponse>;
          this.products = pg.content;
          this.productsTotalPages = pg.totalPages;
          this.productsPage = page;
        }
        this.productsLoading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.productsLoading = false; this.cdr.detectChanges(); },
    });
  }

  private loadProductCategories(): void {
    this.categoryService.getCategories().subscribe({
      next: (r) => { if (r.success) this.productCategories = r.data; this.cdr.detectChanges(); },
      error: () => {},
    });
  }

  onProductSearchChange(value: string): void {
    this.productSearchQuery = value;
    this.searchSubject.next(value);
  }

  openCreateDrawer(): void {
    this.editingProduct = null;
    this._resetDrawer();
    this.initProductForm();
    this.drawerOpen = true;
    this.scrollLock.lock();
    this.cdr.detectChanges();
    setTimeout(() => document.getElementById('admin-drawer-panel')?.scrollTo(0, 0), 0);
  }

  openEditDrawer(product: ProductResponse): void {
    this.editingProduct = product;
    this._resetDrawer();
    this.imagePreview = product.imageUrl || null;
    this.productMedia = product.media ?? [];
    this.initProductForm(product);
    this.drawerOpen = true;
    this.scrollLock.lock();
    this.loadMedia(product.id);
    this.cdr.detectChanges();
    setTimeout(() => document.getElementById('admin-drawer-panel')?.scrollTo(0, 0), 0);
  }

  setDrawerTab(tab: 'info' | 'media'): void {
    this.drawerTab = tab;
    document.getElementById('admin-drawer-panel')?.scrollTo(0, 0);
  }

  closeDrawer(): void {
    this.drawerOpen = false;
    this.editingProduct = null;
    this._resetDrawer();
    this.scrollLock.unlock();
    this.cdr.detectChanges();
  }

  private _resetDrawer(): void {
    this.drawerError = null;
    this.selectedImages = [];
    this.imagePreviews = [];
    this.selectedVideo = null;
    this.videoPreview = null;
    this.imagePreview = null;
    this.selectedImageFile = null;
    this.uploadError = null;
    this.drawerTab = 'info';
    this.productMedia = [];
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
      for (const img of this.selectedImages) fd.append('images', img);
      if (this.selectedVideo) fd.append('video', this.selectedVideo);
      req$ = this.productService.createProduct(fd);
    }

    req$.subscribe({
      next: (r) => {
        this.drawerLoading = false;
        this.toast(this.editingProduct ? 'Produit mis à jour ✓' : 'Produit créé ✓');
        this.loadProducts(this.productsPage);
        this.closeDrawer();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.drawerLoading = false;
        this.drawerError = err?.error?.message || 'Erreur lors de la sauvegarde';
        this.cdr.detectChanges();
      },
    });
  }

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
      this.toast(`Stock mis à jour : ${newStock}`);
      this.stockSavingId = null;
      this.cdr.detectChanges();
    };
    this.productService.updateProduct(product.id, fd).subscribe({ next: apply, error: apply });
  }

  cancelEditStock(): void { this.editingStockId = null; this.cdr.detectChanges(); }

  startDelete(id: number): void { this.editingStockId = null; this.confirmDeleteId = id; this.cdr.detectChanges(); }
  cancelDelete(): void { this.confirmDeleteId = null; this.cdr.detectChanges(); }

  doDelete(product: ProductResponse): void {
    this.confirmDeleteId = null;
    this.productService.deleteProduct(product.id).subscribe({
      next: () => { this.loadProducts(this.productsPage); this.toast(`"${product.name}" supprimé`); this.cdr.detectChanges(); },
      error: () => { this.toast('Erreur de suppression', 'error'); this.cdr.detectChanges(); },
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) Array.from(input.files).forEach(f => this._uploadFile(f));
    input.value = '';
  }

  onVideoSelected(event: Event): void {
    const f = (event.target as HTMLInputElement).files?.[0];
    if (f) this._uploadFile(f);
    (event.target as HTMLInputElement).value = '';
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault(); this.dragOver = false;
    const files = event.dataTransfer?.files;
    if (files) Array.from(files).forEach(f => this._uploadFile(f));
  }
  onDragOver(event: DragEvent): void { event.preventDefault(); this.dragOver = true; this.cdr.detectChanges(); }
  onDragLeave(): void { this.dragOver = false; this.cdr.detectChanges(); }

  private _uploadFile(file: File): void {
    if (file.type.startsWith('video/')) {
      if (file.size > 50 * 1024 * 1024) { this.uploadError = 'Vidéo trop lourde — max 50 Mo'; this.cdr.detectChanges(); return; }
      this.selectedVideo = file;
      this.uploadError = null;
      const reader = new FileReader();
      reader.onload = (e) => { this.videoPreview = e.target?.result as string; this.cdr.detectChanges(); };
      reader.readAsDataURL(file);
      return;
    }
    if (!file.type.startsWith('image/')) { this.uploadError = 'Format non supporté'; this.cdr.detectChanges(); return; }
    if (file.size > 20 * 1024 * 1024) { this.uploadError = 'Image trop lourde — max 20 Mo'; this.cdr.detectChanges(); return; }
    if (this.editingProduct) {
      this.selectedImageFile = file;
      this.uploadError = null;
      const reader = new FileReader();
      reader.onload = (e) => { this.imagePreview = e.target?.result as string; this.cdr.detectChanges(); };
      reader.readAsDataURL(file);
    } else {
      if (this.selectedImages.length >= 4) { this.uploadError = 'Maximum 4 images'; this.cdr.detectChanges(); return; }
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
  clearImage(): void { this.imagePreview = null; this.selectedImageFile = null; this.uploadError = null; this.cdr.detectChanges(); }

  stockClass(stock: number): string {
    if (stock === 0) return 'text-red-400';
    if (stock <= 3)  return 'text-orange-400';
    return 'text-green-400';
  }

  get productPages(): number[] { return Array.from({ length: this.productsTotalPages }, (_, i) => i); }

  // ── Media ──────────────────────────────────────────────────────────────────

  loadMedia(productId: number): void {
    this.mediaLoading = true;
    this.productMediaService.getAll(productId).subscribe({
      next: (r) => { if (r.success) this.productMedia = r.data; this.mediaLoading = false; this.cdr.detectChanges(); },
      error: () => { this.mediaLoading = false; this.cdr.detectChanges(); },
    });
  }

  onMediaSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file && this.editingProduct) this._uploadMedia(file);
    (event.target as HTMLInputElement).value = '';
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
      error: () => { this.mediaUploading = false; this.toast('Erreur d\'upload', 'error'); this.cdr.detectChanges(); },
    });
  }

  deleteMedia(mediaId: number): void {
    if (!this.editingProduct) return;
    this.productMediaService.delete(this.editingProduct.id, mediaId).subscribe({
      next: () => { this.productMedia = this.productMedia.filter(m => m.id !== mediaId); this.cdr.detectChanges(); },
      error: () => this.toast('Erreur de suppression', 'error'),
    });
  }

  // ── Delivery ───────────────────────────────────────────────────────────────

  loadDeliveryOrders(page = 0): void {
    this.deliveryOrdersLoading = true;
    this.orderService.getAllOrders({ page, size: 20 }).subscribe({
      next: (r) => {
        if (r.success) {
          const pg = r.data as PageResponse<OrderResponse>;
          this.deliveryOrders = pg.content.filter(o => ['CONFIRMED', 'DELIVERED'].includes(o.orderStatus));
          this.deliveryOrdersTotalPages = pg.totalPages;
          this.deliveryOrdersPage = page;
        }
        this.deliveryOrdersLoading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.deliveryOrdersLoading = false; this.cdr.detectChanges(); },
    });
  }

  toggleDeliveryOrder(orderId: number): void {
    if (this.expandedDeliveryOrderId === orderId) {
      this.expandedDeliveryOrderId = null;
      this.selectedDelivery = null;
      this.cdr.detectChanges();
      return;
    }
    this.expandedDeliveryOrderId = orderId;
    this.selectedDelivery = null;
    this.deliveryDetailLoading = true;
    this.deliverySubTab = 'events';
    this.cdr.detectChanges();
    this.deliveryService.getDeliveryByOrder(orderId).subscribe({
      next: (r) => {
        if (r.success) {
          this.selectedDelivery = r.data;
          this.deliveryUpdateAgent = r.data.deliveryAgent || '';
          this.deliveryUpdateDate = r.data.estimatedDate ? r.data.estimatedDate.split('T')[0] : '';
          this.deliveryUpdateNotes = r.data.notes || '';
          this.deliveryUpdateCarrier = r.data.carrierName || '';
          this.deliveryUpdateCarrierUrl = r.data.carrierTrackingUrl || '';
        }
        this.deliveryDetailLoading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.deliveryDetailLoading = false; this.cdr.detectChanges(); },
    });
  }

  submitDeliveryEvent(): void {
    if (!this.selectedDelivery || !this.deliveryEventDesc.trim()) return;
    this.deliveryEventSaving = true;
    const data: AddDeliveryEventRequest = {
      status: this.deliveryEventStatus,
      description: this.deliveryEventDesc.trim(),
      location: this.deliveryEventLocation.trim() || undefined,
    };
    this.deliveryService.addDeliveryEvent(this.selectedDelivery.id, data).subscribe({
      next: (r) => {
        if (r.success) { this.selectedDelivery = r.data; this.deliveryEventDesc = ''; this.deliveryEventLocation = ''; this.toast('Événement ajouté ✓'); }
        this.deliveryEventSaving = false;
        this.cdr.detectChanges();
      },
      error: (err) => { this.deliveryEventSaving = false; this.toast(err?.error?.message || 'Erreur', 'error'); this.cdr.detectChanges(); },
    });
  }

  submitDeliveryUpdate(): void {
    if (!this.selectedDelivery) return;
    this.deliveryUpdateSaving = true;
    const data: UpdateDeliveryRequest = {
      deliveryAgent: this.deliveryUpdateAgent.trim() || undefined,
      estimatedDate: this.deliveryUpdateDate || undefined,
      notes: this.deliveryUpdateNotes.trim() || undefined,
      carrierName: this.deliveryUpdateCarrier.trim() || undefined,
      carrierTrackingUrl: this.deliveryUpdateCarrierUrl.trim() || undefined,
    };
    this.deliveryService.updateDelivery(this.selectedDelivery.id, data).subscribe({
      next: (r) => {
        if (r.success) { this.selectedDelivery = r.data; this.toast('Livraison mise à jour ✓'); }
        this.deliveryUpdateSaving = false;
        this.cdr.detectChanges();
      },
      error: (err) => { this.deliveryUpdateSaving = false; this.toast(err?.error?.message || 'Erreur', 'error'); this.cdr.detectChanges(); },
    });
  }

  deliveryStatusLabel(s: string): string {
    const m: Record<string, string> = {
      PREPARING: 'En préparation', OUT_FOR_DELIVERY: 'En livraison', DELIVERED: 'Livré', FAILED: 'Échec',
    };
    return m[s] ?? s;
  }

  deliveryStatusClass(s: string): string {
    const m: Record<string, string> = {
      PREPARING:        'bg-blue-500/15   text-blue-400   border border-blue-500/25',
      OUT_FOR_DELIVERY: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/25',
      DELIVERED:        'bg-green-500/15  text-green-400  border border-green-500/25',
      FAILED:           'bg-red-500/15    text-red-400    border border-red-500/25',
    };
    return m[s] ?? 'bg-white/10 theme-muted border border-white/10';
  }

  get deliveryOrderPages(): number[] { return Array.from({ length: this.deliveryOrdersTotalPages }, (_, i) => i); }

  // ── Users ──────────────────────────────────────────────────────────────────

  loadUsers(page = 0): void {
    this.usersLoading = true;
    this.userService.getAllUsers(page, 15).subscribe({
      next: (r) => {
        if (r.success) {
          const pg = r.data as PageResponse<UserResponse>;
          this.users = pg.content;
          this.usersTotalPages = pg.totalPages;
          this.usersPage = page;
        }
        this.usersLoading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.usersLoading = false; this.cdr.detectChanges(); },
    });
  }

  toggleUser(user: UserResponse): void {
    this.toggleUpdatingId = user.id;
    this.userService.toggleUser(user.id).subscribe({
      next: () => {
        const idx = this.users.findIndex(u => u.id === user.id);
        if (idx !== -1) { this.users = [...this.users]; this.users[idx] = { ...this.users[idx], enabled: !this.users[idx].enabled }; }
        this.toggleUpdatingId = null;
        this.cdr.detectChanges();
      },
      error: () => { this.toggleUpdatingId = null; this.cdr.detectChanges(); },
    });
  }

  openCreateUserModal(): void {
    this.createUserForm = { nom: '', prenom: '', email: '', password: '', phone: '+225', role: UserRole.CUSTOMER };
    this.createUserError = null;
    this.showCreateUserModal = true;
    this.cdr.detectChanges();
  }

  closeCreateUserModal(): void { this.showCreateUserModal = false; this.cdr.detectChanges(); }

  submitCreateUser(): void {
    this.createUserLoading = true;
    this.createUserError = null;
    this.userService.createUser(this.createUserForm).subscribe({
      next: (r) => {
        if (r.success) { this.users = [r.data, ...this.users]; this.showCreateUserModal = false; }
        this.createUserLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => { this.createUserError = err?.error?.message || 'Une erreur est survenue'; this.createUserLoading = false; this.cdr.detectChanges(); },
    });
  }

  get userPages(): number[] { return Array.from({ length: this.usersTotalPages }, (_, i) => i); }

  // ── Categories ─────────────────────────────────────────────────────────────

  loadCategories(): void {
    this.categoriesLoading = true;
    this.categoryService.getAllForAdmin().subscribe({
      next: (r) => { if (r.success) this.categories = r.data; this.categoriesLoading = false; this.cdr.detectChanges(); },
      error: () => { this.categoriesLoading = false; this.cdr.detectChanges(); },
    });
  }

  openCategoryForm(): void {
    this.editingCategory = null;
    this.categoryForm = { name: '', description: '', imageUrl: '' };
    this.categoryFormError = null;
    this.showCategoryForm = true;
    this.scrollLock.lock();
    this.cdr.detectChanges();
  }

  openEditCategoryForm(cat: CategoryResponse): void {
    this.editingCategory = cat;
    this.categoryForm = { name: cat.name, description: cat.description ?? '', imageUrl: cat.imageUrl ?? '' };
    this.categoryFormError = null;
    this.showCategoryForm = true;
    this.scrollLock.lock();
    this.cdr.detectChanges();
  }

  closeCategoryForm(): void { this.showCategoryForm = false; this.editingCategory = null; this.categoryFormError = null; this.scrollLock.unlock(); this.cdr.detectChanges(); }

  submitCategory(): void {
    if (!this.categoryForm.name.trim()) { this.categoryFormError = 'Le nom est obligatoire'; return; }
    this.categoryFormLoading = true;
    this.categoryFormError = null;
    const payload = { name: this.categoryForm.name.trim(), description: this.categoryForm.description.trim() || undefined, imageUrl: this.categoryForm.imageUrl.trim() || undefined };
    const req$ = this.editingCategory
      ? this.categoryService.updateCategory(this.editingCategory.id, payload)
      : this.categoryService.createCategory(payload);
    req$.subscribe({
      next: (r) => {
        if (r.success) {
          if (this.editingCategory) {
            const idx = this.categories.findIndex(c => c.id === this.editingCategory!.id);
            if (idx !== -1) { this.categories = [...this.categories]; this.categories[idx] = r.data; }
          } else {
            this.categories = [...this.categories, r.data];
          }
          this.showCategoryForm = false;
          this.editingCategory = null;
        }
        this.categoryFormLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => { this.categoryFormError = err?.error?.message || 'Erreur lors de la sauvegarde'; this.categoryFormLoading = false; this.cdr.detectChanges(); },
    });
  }

  toggleCategory(cat: CategoryResponse): void {
    this.categoryToggleId = cat.id;
    this.categoryService.toggleCategoryActive(cat.id).subscribe({
      next: (r) => {
        if (r.success) {
          const idx = this.categories.findIndex(c => c.id === cat.id);
          if (idx !== -1) { this.categories = [...this.categories]; this.categories[idx] = r.data; }
        }
        this.categoryToggleId = null;
        this.cdr.detectChanges();
      },
      error: () => { this.categoryToggleId = null; this.cdr.detectChanges(); },
    });
  }

  get activeCategories():   number { return this.categories.filter(c => c.active).length; }
  get inactiveCategories(): number { return this.categories.filter(c => !c.active).length; }

  // ── Users — Fiche complète ─────────────────────────────────────────────────

  openUserProfile(userId: number): void {
    this.userFullProfile = null;
    this.userFullProfileLoading = true;
    this.showUserProfile = true;
    this.scrollLock.lock();
    this.cdr.detectChanges();
    this.userService.getFullProfile(userId).subscribe({
      next: (r) => { if (r.success) this.userFullProfile = r.data; this.userFullProfileLoading = false; this.cdr.detectChanges(); },
      error: () => { this.userFullProfileLoading = false; this.cdr.detectChanges(); },
    });
  }

  closeUserProfile(): void { this.showUserProfile = false; this.userFullProfile = null; this.scrollLock.unlock(); this.cdr.detectChanges(); }

  // ── Caisse journalière ─────────────────────────────────────────────────────

  loadDailyCaisse(): void {
    this.dailyCaisseLoading = true;
    this.dashboardService.getDailyCaisse(this.caisseDate).subscribe({
      next: (r) => { if (r.success) this.dailyCaisse = r.data; this.dailyCaisseLoading = false; this.cdr.detectChanges(); },
      error: () => { this.dailyCaisseLoading = false; this.cdr.detectChanges(); },
    });
  }

  // ── Codes promo ────────────────────────────────────────────────────────────

  loadPromos(): void {
    this.promosLoading = true;
    this.promoService.getAllPromos().subscribe({
      next: (r) => { if (r.success) this.promos = r.data; this.promosLoading = false; this.cdr.detectChanges(); },
      error: () => { this.promosLoading = false; this.cdr.detectChanges(); },
    });
  }

  openPromoForm(): void {
    this.promoForm = { code: '', discountPercent: 10, publicVisible: false };
    this.promoFormError = null;
    this.showPromoForm = true;
    this.cdr.detectChanges();
  }

  closePromoForm(): void { this.showPromoForm = false; this.promoFormError = null; this.cdr.detectChanges(); }

  submitPromo(): void {
    if (!this.promoForm.code.trim()) { this.promoFormError = 'Le code est obligatoire'; return; }
    this.promoFormLoading = true;
    this.promoFormError = null;
    this.promoService.createPromo({ ...this.promoForm, code: this.promoForm.code.toUpperCase() }).subscribe({
      next: (r) => {
        if (r.success) { this.promos = [r.data, ...this.promos]; this.showPromoForm = false; this.toast('Code promo créé ✓'); }
        this.promoFormLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => { this.promoFormError = err?.error?.message || 'Erreur'; this.promoFormLoading = false; this.cdr.detectChanges(); },
    });
  }

  togglePromo(promo: PromoResponse): void {
    this.promoService.togglePromo(promo.id).subscribe({
      next: (r) => {
        if (r.success) {
          const idx = this.promos.findIndex(p => p.id === promo.id);
          if (idx !== -1) { this.promos = [...this.promos]; this.promos[idx] = r.data; }
        }
        this.cdr.detectChanges();
      },
      error: () => this.cdr.detectChanges(),
    });
  }

  deletePromo(promo: PromoResponse): void {
    this.promoService.deletePromo(promo.id).subscribe({
      next: () => { this.promos = this.promos.filter(p => p.id !== promo.id); this.toast('Code supprimé'); this.cdr.detectChanges(); },
      error: () => { this.toast('Erreur de suppression', 'error'); this.cdr.detectChanges(); },
    });
  }

  // ── Avis & notations ───────────────────────────────────────────────────────

  loadReviews(page = 0): void {
    this.reviewsLoading = true;
    this.reviewService.getAllReviews(page, 20).subscribe({
      next: (r) => {
        if (r.success) {
          const pg = r.data as any;
          this.reviews = pg.content;
          this.reviewsTotalPages = pg.totalPages;
          this.reviewsPage = page;
        }
        this.reviewsLoading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.reviewsLoading = false; this.cdr.detectChanges(); },
    });
  }

  toggleReviewVisibility(review: ReviewResponse): void {
    this.reviewService.toggleVisibility(review.id).subscribe({
      next: (r) => {
        if (r.success) {
          const idx = this.reviews.findIndex(rv => rv.id === review.id);
          if (idx !== -1) { this.reviews = [...this.reviews]; this.reviews[idx] = r.data; }
        }
        this.cdr.detectChanges();
      },
      error: () => this.cdr.detectChanges(),
    });
  }

  adminDeleteReview(review: ReviewResponse): void {
    this.reviewService.adminDeleteReview(review.id).subscribe({
      next: () => { this.reviews = this.reviews.filter(rv => rv.id !== review.id); this.toast('Avis supprimé'); this.cdr.detectChanges(); },
      error: () => { this.toast('Erreur de suppression', 'error'); this.cdr.detectChanges(); },
    });
  }

  get reviewPages(): number[] { return Array.from({ length: this.reviewsTotalPages }, (_, i) => i); }

  // ── Retours ────────────────────────────────────────────────────────────────

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
        this.cdr.detectChanges();
      },
      error: () => { this.returnsLoading = false; this.cdr.detectChanges(); },
    });
  }

  openReturnDecisionModal(ret: ReturnResponse): void {
    this.returnDecisionItem = ret;
    this.returnDecision = 'APPROVED';
    this.returnDecisionNote = '';
    this.returnDecisionModal = true;
    this.scrollLock.lock();
    this.cdr.detectChanges();
  }

  closeReturnDecisionModal(): void { this.returnDecisionModal = false; this.returnDecisionItem = null; this.scrollLock.unlock(); this.cdr.detectChanges(); }

  submitReturnDecision(): void {
    if (!this.returnDecisionItem) return;
    this.returnDecisionLoading = true;
    const data: ReturnDecisionRequest = { decision: this.returnDecision, adminNote: this.returnDecisionNote.trim() || undefined };
    this.returnService.processDecision(this.returnDecisionItem.id, data).subscribe({
      next: (r) => {
        if (r.success) {
          const idx = this.returns.findIndex(ret => ret.id === this.returnDecisionItem!.id);
          if (idx !== -1) { this.returns = [...this.returns]; this.returns[idx] = r.data; }
          this.toast('Décision enregistrée ✓');
          this.closeReturnDecisionModal();
        }
        this.returnDecisionLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => { this.returnDecisionLoading = false; this.toast(err?.error?.message || 'Erreur', 'error'); this.cdr.detectChanges(); },
    });
  }

  returnStatusLabel(s: string): string {
    const m: Record<string, string> = { PENDING: 'En attente', APPROVED: 'Accepté', REJECTED: 'Refusé', COMPLETED: 'Traité' };
    return m[s] ?? s;
  }

  returnStatusClass(s: string): string {
    const m: Record<string, string> = {
      PENDING:   'bg-yellow-500/15 text-yellow-400 border border-yellow-500/25',
      APPROVED:  'bg-green-500/15  text-green-400  border border-green-500/25',
      REJECTED:  'bg-red-500/15    text-red-400    border border-red-500/25',
      COMPLETED: 'bg-blue-500/15   text-blue-400   border border-blue-500/25',
    };
    return m[s] ?? 'bg-white/10 text-gray-400 border border-white/10';
  }

  get returnPages(): number[] { return Array.from({ length: this.returnsTotalPages }, (_, i) => i); }

  // ── Stats helpers ──────────────────────────────────────────────────────────

  get revenueGrowthPct(): number {
    if (!this.stats) return 0;
    const cur  = Number(this.stats.currentMonthRevenue  ?? 0);
    const prev = Number(this.stats.previousMonthRevenue ?? 0);
    if (prev === 0) return cur > 0 ? 100 : 0;
    return Math.round((cur - prev) / prev * 100);
  }

  get revenueGrowthPositive(): boolean { return this.revenueGrowthPct >= 0; }

  get completionRate(): number {
    if (!this.stats?.ordersByStatus) return 0;
    const get = (s: string) => this.stats!.ordersByStatus.find(x => x.status === s)?.count ?? 0;
    const delivered = get('DELIVERED');
    const cancelled = get('CANCELLED');
    const confirmed = get('CONFIRMED');
    const total = delivered + cancelled + confirmed;
    return total === 0 ? 0 : Math.round((delivered / total) * 100);
  }

  get insights(): Insight[] {
    if (!this.stats) return [];
    const list: Insight[] = [];
    const growth = this.revenueGrowthPct;
    if (growth > 0) list.push({ type: 'success', icon: 'trending-up', message: `CA en hausse de +${growth}% ce mois`, detail: `vs ${this.formatAmount(this.stats.previousMonthRevenue)} le mois dernier` });
    else if (growth < 0) list.push({ type: 'warning', icon: 'trending-down', message: `CA en baisse de ${growth}% ce mois`, detail: `vs ${this.formatAmount(this.stats.previousMonthRevenue)} le mois dernier` });
    if (this.stats.lowStockCount > 0) list.push({ type: 'warning', icon: 'alert', message: `${this.stats.lowStockCount} produit${this.stats.lowStockCount > 1 ? 's' : ''} en stock faible`, detail: 'Seuil critique : ≤ 5 unités restantes' });
    if (this.stats.newUsersThisMonth > 0) list.push({ type: 'info', icon: 'users', message: `${this.stats.newUsersThisMonth} nouvel${this.stats.newUsersThisMonth > 1 ? 'aux' : ''} utilisateur${this.stats.newUsersThisMonth > 1 ? 's' : ''} ce mois` });
    if (this.completionRate >= 80) list.push({ type: 'success', icon: 'check-circle', message: `Excellent taux de livraison : ${this.completionRate}%` });
    else if (this.completionRate > 0 && this.completionRate < 60) list.push({ type: 'warning', icon: 'alert', message: `Taux de livraison faible : ${this.completionRate}%`, detail: 'Vérifier les commandes annulées' });
    return list;
  }

  get currentCalendarMonth(): number { return new Date().getMonth() + 1; }
  get maxMonthlyRevenue(): number { return Math.max(...this.monthlyRevenue.map(m => Number(m.revenue)), 1); }
  get maxTopProduct(): number { return Math.max(...this.topProducts.map(p => p.totalSold), 1); }

  get bestMonthIndex(): number {
    if (!this.monthlyRevenue.length) return -1;
    let best = 0;
    this.monthlyRevenue.forEach((m, i) => { if (Number(m.revenue) > Number(this.monthlyRevenue[best].revenue)) best = i; });
    return Number(this.monthlyRevenue[best].revenue) > 0 ? best : -1;
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = { PENDING: 'En attente', CONFIRMED: 'Confirmée', SHIPPED: 'Expédiée', DELIVERED: 'Livrée', CANCELLED: 'Annulée' };
    return labels[status] ?? status;
  }

  statusColor(status: string): string {
    const colors: Record<string, string> = {
      PENDING:   'bg-yellow-500/15 text-yellow-400',
      CONFIRMED: 'bg-blue-500/15   text-blue-400',
      SHIPPED:   'bg-orange-500/15 text-orange-400',
      DELIVERED: 'bg-emerald-500/15 text-emerald-400',
      CANCELLED: 'bg-red-500/15    text-red-400',
    };
    return colors[status] ?? 'bg-white/10 text-gray-400';
  }

  insightColors(type: Insight['type']): { border: string; bg: string; text: string; dot: string } {
    const map = {
      success: { border: 'border-emerald-500/25', bg: 'bg-emerald-500/8',  text: 'text-emerald-400', dot: 'bg-emerald-400' },
      warning: { border: 'border-amber-500/25',   bg: 'bg-amber-500/8',    text: 'text-amber-400',   dot: 'bg-amber-400'   },
      danger:  { border: 'border-red-500/25',      bg: 'bg-red-500/8',      text: 'text-red-400',     dot: 'bg-red-400'     },
      action:  { border: 'border-blue-500/25',     bg: 'bg-blue-500/8',     text: 'text-blue-400',    dot: 'bg-blue-400'    },
      info:    { border: 'border-violet-500/25',   bg: 'bg-violet-500/8',   text: 'text-violet-400',  dot: 'bg-violet-400'  },
    };
    return map[type];
  }

  formatAmount(val: number | null | undefined): string {
    const n = Number(val ?? 0);
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M FCFA`;
    if (n >= 1_000)     return `${Math.round(n / 1_000)} K FCFA`;
    return `${n} FCFA`;
  }

  formatCurrency(amount: number): string {
    if (amount >= 1_000_000) return (amount / 1_000_000).toFixed(1) + 'M';
    if (amount >= 1_000) return Math.round(amount / 1_000) + 'K';
    return amount.toString();
  }

  timeAgo(dateStr: string): string {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins  = Math.floor(diff / 60_000);
    const hours = Math.floor(diff / 3_600_000);
    const days  = Math.floor(diff / 86_400_000);
    if (mins  < 1)  return "à l'instant";
    if (mins  < 60) return `il y a ${mins} min`;
    if (hours < 24) return `il y a ${hours}h`;
    if (days  < 7)  return `il y a ${days}j`;
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  }
}
