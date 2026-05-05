import { Component, OnInit, OnDestroy, ChangeDetectorRef, HostListener } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { MediaUrlPipe } from '../../../shared/pipes/media-url.pipe';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProductService } from '../../../core/services/product.service';
import { CategoryService } from '../../../core/services/category.service';
import { AuthService } from '../../../core/services/auth.service';
import { ProductMediaService } from '../../../core/services/product-media.service';
import { ProductVariantService, ProductVariantRequest } from '../../../core/services/product-variant.service';
import { OrderService } from '../../../core/services/order.service';
import { DeliveryService } from '../../../core/services/delivery.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { ProductResponse, GetProductsParams, ProductMediaItem, ProductVariant, Gender } from '../../../core/models/product.models';
import { CategoryResponse } from '../../../core/models/category.models';
import { OrderResponse } from '../../../core/models/order.models';
import { DeliveryResponse, AddDeliveryEventRequest, UpdateDeliveryRequest } from '../../../core/models/delivery.models';
import { PageResponse, OrderStatus, DeliveryStatus } from '../../../core/models/common.models';
import { ScrollLockService } from '../../../core/services/scroll-lock.service';
import { WebSocketService } from '../../../core/services/websocket.service';

interface Toast { id: number; msg: string; type: 'success' | 'error'; }

@Component({
  selector: 'app-manager',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ReactiveFormsModule, MediaUrlPipe],
  templateUrl: './manager.component.html',
  styleUrls: ['./manager.component.css'],
})
export class ManagerComponent implements OnInit, OnDestroy {

  // ── Page tab ──────────────────────────────────────────────────────────────
  pageTab: 'products' | 'orders' | 'delivery' | 'dashboard' = 'products';

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
  // Create mode: multi-image (max 4) + video
  selectedImages: File[] = [];
  imagePreviews: string[] = [];
  selectedVideo: File | null = null;
  videoPreview: string | null = null;
  // Edit mode: single main image
  imagePreview: string | null = null;
  selectedImageFile: File | null = null;
  uploadError: string | null = null;
  dragOver = false;

  // ── Drawer tabs & media ───────────────────────────────────────────────────
  drawerTab: 'info' | 'media' | 'variants' = 'info';
  productMedia: ProductMediaItem[] = [];
  mediaLoading = false;
  mediaUploading = false;
  productVariants: ProductVariant[] = [];
  variantsLoading = false;
  variantSaving = false;
  variantError: string | null = null;
  newVariant: ProductVariantRequest = { colorName: '', colorHex: '#000000', imageUrl: '', stock: 0 };
  editingVariant: ProductVariant | null = null;

  // ── Orders management ─────────────────────────────────────────────────────
  pendingOrdersCount = 0;
  allOrders: OrderResponse[] = [];
  ordersLoading = false;
  ordersPage = 0;
  ordersTotalPages = 0;
  statusFilter: OrderStatus | '' = '';
  statusUpdatingId: number | null = null;
  selectedOrder: OrderResponse | null = null;
  orderDetailOpen = false;
  readonly orderStatuses = Object.values(OrderStatus);
  readonly nextStatusMap: Record<string, OrderStatus | null> = {
    PENDING:   OrderStatus.CONFIRMED,
    CONFIRMED: OrderStatus.SHIPPED,
    SHIPPED:   OrderStatus.DELIVERED,
    DELIVERED: null,
    CANCELLED: null,
  };

  // ── Delivery tab ──────────────────────────────────────────────────────────
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
  deliveryUpdateSaving = false;
  deliverySubTab: 'events' | 'update' = 'events';
  readonly deliveryStatuses = Object.values(DeliveryStatus);

  // ── Manager dashboard stats ───────────────────────────────────────────────
  managerStats: any = null;
  managerStatsLoading = false;

  // ── Inline stock edit ─────────────────────────────────────────────────────
  editingStockId: number | null = null;
  editingStockValue = 0;
  stockSavingId: number | null = null;

  // ── Inline discount edit ──────────────────────────────────────────────────
  discountEditingId: number | null = null;
  discountEditValue = 0;
  discountSavingId: number | null = null;

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
    private authService: AuthService,
    private productMediaService: ProductMediaService,
    private productVariantService: ProductVariantService,
    private orderService: OrderService,
    private deliveryService: DeliveryService,
    private dashboardService: DashboardService,
    private wsService: WebSocketService,
    private fb: FormBuilder,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private scrollLock: ScrollLockService,
  ) {}

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.drawerOpen) this.closeDrawer();
    else if (this.editingStockId !== null) this.cancelEditStock();
    else if (this.discountEditingId !== null) this.cancelEditDiscount();
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

    // Temps réel : nouvelles commandes / changements de statut
    this.wsService.orderEvent$
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        this.pendingOrdersCount = event.pendingCount;
        if (this.pageTab === 'orders') {
          this.loadAllOrders(0);
        }
        this.cdr.detectChanges();
      });
  }

  ngOnDestroy(): void {
    this.scrollLock.forceUnlock();
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
      categoryId:  [product?.category?.id  ?? null, Validators.required],
    });
  }

  openCreateDrawer(): void {
    this.editingProduct = null;
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
    this.initForm();
    this.drawerOpen = true;
    this.scrollLock.lock();
    this.cdr.detectChanges();
    setTimeout(() => document.getElementById('manager-drawer-body')?.scrollTo(0, 0), 0);
  }

  openEditDrawer(product: ProductResponse): void {
    this.editingProduct = product;
    this.drawerError = null;
    this.selectedImages = [];
    this.imagePreviews = [];
    this.selectedVideo = null;
    this.videoPreview = null;
    this.imagePreview = product.imageUrl || null;
    this.selectedImageFile = null;
    this.uploadError = null;
    this.drawerTab = 'info';
    this.productMedia = product.media ?? [];
    this.productVariants = product.variants ?? [];
    this.variantError = null;
    this.editingVariant = null;
    this.newVariant = { colorName: '', colorHex: '#000000', imageUrl: '', stock: 0 };
    this.initForm(product);
    this.drawerOpen = true;
    this.scrollLock.lock();
    this.loadMedia(product.id);
    this.loadVariants(product.id);
    this.cdr.detectChanges();
    setTimeout(() => document.getElementById('manager-drawer-body')?.scrollTo(0, 0), 0);
  }

  setDrawerTab(tab: 'info' | 'media' | 'variants'): void {
    this.drawerTab = tab;
    document.getElementById('manager-drawer-body')?.scrollTo(0, 0);
  }

  closeDrawer(): void {
    this.drawerOpen = false;
    this.scrollLock.unlock();
    this.editingProduct = null;
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
    this.productVariants = [];
    this.variantError = null;
    this.editingVariant = null;
    this.newVariant = { colorName: '', colorHex: '#000000', imageUrl: '', stock: 0 };
    this.cdr.detectChanges();
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
      // Édition : 1 image principale + vidéo optionnelle
      if (this.selectedImageFile) fd.append('mainImage', this.selectedImageFile);
      if (this.selectedVideo) fd.append('video', this.selectedVideo);
      req$ = this.productService.updateProduct(this.editingProduct.id, fd);
    } else {
      // Création : jusqu'à 4 images (1ère = principale) + vidéo optionnelle
      for (const img of this.selectedImages) fd.append('images', img);
      if (this.selectedVideo) fd.append('video', this.selectedVideo);
      req$ = this.productService.createProduct(fd);
    }

    const wasCreating = !this.editingProduct;
    req$.subscribe({
      next: (r) => {
        this.drawerLoading = false;
        if (r.success) {
          this.loadProducts(this.currentPage);
          if (wasCreating && r.data) {
            // Après création : rester dans le drawer en mode édition, aller sur l'onglet Couleurs
            this.editingProduct = r.data;
            this.drawerTab = 'variants';
            this.productVariants = [];
            this.loadVariants(r.data.id);
            this.initForm(r.data);
            this.toast('Produit ajouté ✓ — Ajoutez des couleurs si nécessaire');
          } else {
            this.toast('Produit mis à jour ✓');
            this.closeDrawer();
          }
        } else {
          this._applyLocalSave(v);
          this.closeDrawer();
        }
        this.cdr.detectChanges();
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
      this.toast(`Stock mis à jour : ${newStock}`);
      this.stockSavingId = null;
      this.cdr.detectChanges();
    };
    this.productService.updateProduct(product.id, fd).subscribe({ next: applyLocally, error: applyLocally });
  }

  cancelEditStock(): void { this.editingStockId = null; this.cdr.detectChanges(); }

  // ── Inline discount ───────────────────────────────────────────────────────

  startEditDiscount(product: ProductResponse): void {
    this.editingStockId = null;
    this.confirmDeleteId = null;
    this.discountEditingId = product.id;
    this.discountEditValue = product.discountPercent ?? 0;
    this.cdr.detectChanges();
  }

  confirmEditDiscount(product: ProductResponse): void {
    const pct = Math.max(0, Math.min(100, Math.round(+this.discountEditValue || 0)));
    this.discountEditingId = null;
    const unchanged = (product.discountPercent ?? 0) === pct;
    if (unchanged) { this.cdr.detectChanges(); return; }
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
      const msg = pct > 0 ? `Remise ${pct}% appliquée` : 'Remise supprimée';
      this.toast(msg);
      this.discountSavingId = null;
      this.cdr.detectChanges();
    };
    this.productService.setDiscount(product.id, pct > 0 ? pct : null).subscribe({
      next: (r) => apply(r.data ?? undefined),
      error: () => apply(),
    });
  }

  cancelEditDiscount(): void { this.discountEditingId = null; this.cdr.detectChanges(); }

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
    const files = event.dataTransfer?.files;
    if (files) Array.from(files).forEach(f => this._uploadFile(f));
  }
  onDragOver(event: DragEvent): void { event.preventDefault(); this.dragOver = true; this.cdr.detectChanges(); }
  onDragLeave(): void { this.dragOver = false; this.cdr.detectChanges(); }
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
    if (!this._isImageFile(file)) { this.uploadError = 'Format non supporté — JPEG, PNG, WEBP, GIF, BMP, TIFF, SVG, AVIF, HEIC'; this.cdr.detectChanges(); return; }
    if (file.size > 20 * 1024 * 1024) { this.uploadError = 'Image trop lourde — max 20 Mo'; this.cdr.detectChanges(); return; }

    if (this.editingProduct) {
      // Mode édition : 1 seule image principale
      this.selectedImageFile = file;
      this.uploadError = null;
      const reader = new FileReader();
      reader.onload = (e) => { this.imagePreview = e.target?.result as string; this.cdr.detectChanges(); };
      reader.readAsDataURL(file);
    } else {
      // Mode création : jusqu'à 4 images
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

  clearImage(): void { this.imagePreview = null; this.selectedImageFile = null; this.uploadError = null; this.cdr.detectChanges(); }

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

  setPageTab(tab: 'products' | 'orders' | 'delivery' | 'dashboard'): void {
    this.pageTab = tab;
    if (tab === 'orders' && this.allOrders.length === 0) this.loadAllOrders();
    if (tab === 'delivery' && this.deliveryOrders.length === 0) this.loadDeliveryOrders();
    if (tab === 'dashboard') this.loadManagerStats();
    if (this.drawerOpen) this.closeDrawer();
    this.cdr.detectChanges();
  }

  // ── Orders management ─────────────────────────────────────────────────────

  openOrderDetail(order: OrderResponse): void {
    this.selectedOrder = order;
    this.orderDetailOpen = true;
    this.scrollLock.lock();
    this.cdr.detectChanges();
  }

  closeOrderDetail(): void {
    this.orderDetailOpen = false;
    this.selectedOrder = null;
    this.scrollLock.unlock();
    this.cdr.detectChanges();
  }

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
    // PENDING → CONFIRMED : utiliser l'endpoint dédié /validate
    const request$ = order.orderStatus === 'PENDING'
      ? this.orderService.validateOrder(order.id)
      : this.orderService.updateOrderStatus(order.id, next);
    request$.subscribe({
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
      error: (err: any) => { this.statusUpdatingId = null; this.toast(err?.error?.message || 'Erreur d\'annulation', 'error'); this.cdr.detectChanges(); },
    });
  }

  // ── Delivery management ───────────────────────────────────────────────────

  loadDeliveryOrders(page = 0): void {
    this.deliveryOrdersLoading = true;
    this.orderService.getAllOrders({ page, size: 20 }).subscribe({
      next: (r) => {
        if (r.success) {
          const pg = r.data as PageResponse<OrderResponse>;
          this.deliveryOrders = pg.content.filter(o =>
            ['CONFIRMED', 'DELIVERED'].includes(o.orderStatus));
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
        if (r.success) {
          this.selectedDelivery = r.data;
          this.deliveryEventDesc = '';
          this.deliveryEventLocation = '';
          this.toast('Événement de livraison ajouté ✓');
        }
        this.deliveryEventSaving = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.deliveryEventSaving = false;
        this.toast(err?.error?.message || 'Erreur', 'error');
        this.cdr.detectChanges();
      },
    });
  }

  submitDeliveryUpdate(): void {
    if (!this.selectedDelivery) return;
    this.deliveryUpdateSaving = true;
    const data: UpdateDeliveryRequest = {
      deliveryAgent: this.deliveryUpdateAgent.trim() || undefined,
      estimatedDate: this.deliveryUpdateDate || undefined,
      notes: this.deliveryUpdateNotes.trim() || undefined,
    };
    this.deliveryService.updateDelivery(this.selectedDelivery.id, data).subscribe({
      next: (r) => {
        if (r.success) {
          this.selectedDelivery = r.data;
          this.toast('Informations de livraison mises à jour ✓');
        }
        this.deliveryUpdateSaving = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.deliveryUpdateSaving = false;
        this.toast(err?.error?.message || 'Erreur', 'error');
        this.cdr.detectChanges();
      },
    });
  }

  deliveryStatusLabel(s: string): string {
    const m: Record<string, string> = {
      PREPARING:        'En préparation',
      OUT_FOR_DELIVERY: 'En livraison',
      DELIVERED:        'Livré',
      FAILED:           'Échec',
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
    return m[s] ?? 'bg-black/[.06] theme-muted border border-black/[.10]';
  }

  get deliveryOrderPages(): number[] { return Array.from({ length: this.deliveryOrdersTotalPages }, (_, i) => i); }

  // ── Manager stats ──────────────────────────────────────────────────────────

  loadManagerStats(): void {
    this.managerStatsLoading = true;
    this.dashboardService.getManagerStats().subscribe({
      next: (r) => {
        if (r.success) this.managerStats = r.data;
        this.managerStatsLoading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.managerStatsLoading = false; this.cdr.detectChanges(); },
    });
  }

  formatCurrency(amount: number): string {
    if (amount >= 1_000_000) return (amount / 1_000_000).toFixed(1) + 'M';
    if (amount >= 1_000) return Math.round(amount / 1_000) + 'K';
    return amount.toString();
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
    return m[s] ?? 'bg-black/[.06] theme-muted border border-black/[.10]';
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

  // ── Variants ───────────────────────────────────────────────────────────────

  loadVariants(productId: number): void {
    this.variantsLoading = true;
    this.productVariantService.getVariants(productId).subscribe({
      next: (r) => { if (r.success) this.productVariants = r.data; this.variantsLoading = false; this.cdr.detectChanges(); },
      error: () => { this.variantsLoading = false; this.cdr.detectChanges(); },
    });
  }

  saveVariant(): void {
    if (!this.editingProduct) return;
    if (!this.newVariant.colorName.trim()) { this.variantError = 'Le nom de la couleur est requis'; return; }
    if (!/^#[0-9A-Fa-f]{6}$/.test(this.newVariant.colorHex)) { this.variantError = 'Couleur hex invalide (ex: #FF5733)'; return; }
    this.variantSaving = true;
    this.variantError = null;

    const req$ = this.editingVariant
      ? this.productVariantService.updateVariant(this.editingProduct.id, this.editingVariant.id, this.newVariant)
      : this.productVariantService.addVariant(this.editingProduct.id, this.newVariant);

    req$.subscribe({
      next: (r) => {
        if (r.success) {
          if (this.editingVariant) {
            this.productVariants = this.productVariants.map(v => v.id === r.data.id ? r.data : v);
          } else {
            this.productVariants = [...this.productVariants, r.data];
          }
          this.editingVariant = null;
          this.newVariant = { colorName: '', colorHex: '#000000', imageUrl: '', stock: 0 };
        }
        this.variantSaving = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.variantError = err?.error?.message || "Erreur lors de l'enregistrement";
        this.variantSaving = false;
        this.cdr.detectChanges();
      },
    });
  }

  startEditVariant(variant: ProductVariant): void {
    this.editingVariant = variant;
    this.newVariant = { colorName: variant.colorName, colorHex: variant.colorHex, imageUrl: variant.imageUrl || '', stock: variant.stock };
    this.cdr.detectChanges();
  }

  cancelEditVariant(): void {
    this.editingVariant = null;
    this.newVariant = { colorName: '', colorHex: '#000000', imageUrl: '', stock: 0 };
    this.variantError = null;
    this.cdr.detectChanges();
  }

  deleteVariant(variantId: number): void {
    if (!this.editingProduct) return;
    this.productVariantService.deleteVariant(this.editingProduct.id, variantId).subscribe({
      next: () => { this.productVariants = this.productVariants.filter(v => v.id !== variantId); this.cdr.detectChanges(); },
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
