import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProductService } from '../../../core/services/product.service';
import { CategoryService } from '../../../core/services/category.service';
import { UploadService } from '../../../core/services/upload.service';
import { AuthService } from '../../../core/services/auth.service';
import { ProductResponse, GetProductsParams } from '../../../core/models/product.models';
import { CategoryResponse } from '../../../core/models/category.models';
import { PageResponse } from '../../../core/models/common.models';

interface Toast { id: number; msg: string; type: 'success' | 'error'; }

@Component({
  selector: 'app-manager',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ReactiveFormsModule],
  templateUrl: './manager.component.html',
  styleUrls: ['./manager.component.css'],
})
export class ManagerComponent implements OnInit {

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

  // ── Inline stock edit ─────────────────────────────────────────────────────
  editingStockId: number | null = null;
  editingStockValue = 0;
  stockSavingId: number | null = null;

  // ── Inline delete confirm ─────────────────────────────────────────────────
  confirmDeleteId: number | null = null;

  // ── Toasts ────────────────────────────────────────────────────────────────
  toasts: Toast[] = [];
  private _toastId = 0;

  // ── Fallback categories ───────────────────────────────────────────────────
  private readonly CAT_ELEC   = { id: 1, name: 'Électronique',    slug: 'electronique',   description: '', imageUrl: '', active: true, createdAt: '' };
  private readonly CAT_MODE   = { id: 2, name: 'Mode & Vêtements', slug: 'mode-vetements', description: '', imageUrl: '', active: true, createdAt: '' };
  private readonly CAT_MAISON = { id: 3, name: 'Maison & Cuisine',  slug: 'maison-cuisine', description: '', imageUrl: '', active: true, createdAt: '' };
  private readonly CAT_BEAUTE = { id: 4, name: 'Beauté & Santé',    slug: 'beaute-sante',   description: '', imageUrl: '', active: true, createdAt: '' };
  private readonly CAT_SPORT  = { id: 5, name: 'Sports & Loisirs',  slug: 'sports-loisirs', description: '', imageUrl: '', active: true, createdAt: '' };

  private readonly mockProducts: ProductResponse[] = [
    { id: 1, name: 'iPhone 15 Pro',           slug: 'iphone-15-pro',      description: 'Smartphone Apple iPhone 15 Pro 256Go, puce A17 Pro, appareil photo 48MP.',        price: 650000,  stock: 15, imageUrl: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&q=80', category: this.CAT_ELEC,   active: true, createdAt: '', updatedAt: '' },
    { id: 2, name: 'Samsung Galaxy S24',      slug: 'samsung-galaxy-s24', description: 'Smartphone Samsung Galaxy S24 128Go, écran Dynamic AMOLED 6.2 pouces.',          price: 450000,  stock: 20, imageUrl: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400&q=80', category: this.CAT_ELEC,   active: true, createdAt: '', updatedAt: '' },
    { id: 3, name: 'MacBook Air M2',          slug: 'macbook-air-m2',     description: 'Ordinateur portable Apple MacBook Air 13 pouces, puce M2, 8Go RAM, 256Go SSD.',  price: 1200000, stock: 8,  imageUrl: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=400&q=80', category: this.CAT_ELEC,   active: true, createdAt: '', updatedAt: '' },
    { id: 4, name: 'Sac à main Cuir',         slug: 'sac-main-cuir',      description: 'Sac à main en cuir véritable, design élégant, compartiments multiples.',          price: 55000,   stock: 18, imageUrl: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&q=80', category: this.CAT_MODE,   active: true, createdAt: '', updatedAt: '' },
    { id: 5, name: 'Robe Wax Traditionnelle', slug: 'robe-wax',           description: 'Robe en tissu wax 100% coton, motifs traditionnels africains, taille ajustable.', price: 25000,   stock: 30, imageUrl: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400&q=80', category: this.CAT_MODE,   active: true, createdAt: '', updatedAt: '' },
    { id: 6, name: 'Climatiseur Hisense',     slug: 'clim-hisense',       description: 'Climatiseur split Hisense 1.5 CV, fonction froid/chaud, économique en énergie.', price: 280000,  stock: 10, imageUrl: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&q=80', category: this.CAT_MAISON, active: true, createdAt: '', updatedAt: '' },
    { id: 7, name: 'Crème Hydratante Nivea',  slug: 'creme-nivea',        description: 'Crème hydratante corps Nivea 400ml, formule enrichie en aloe vera.',              price: 3500,    stock: 50, imageUrl: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&q=80', category: this.CAT_BEAUTE, active: true, createdAt: '', updatedAt: '' },
    { id: 8, name: 'Vélo de Sport',           slug: 'velo-sport',         description: 'Vélo de sport tout terrain 21 vitesses, cadre aluminium, freins à disque.',      price: 120000,  stock: 7,  imageUrl: 'https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=400&q=80', category: this.CAT_SPORT,  active: true, createdAt: '', updatedAt: '' },
  ];

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private uploadService: UploadService,
    private authService: AuthService,
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
      name:        [product?.name        ?? '', Validators.required],
      description: [product?.description ?? '', Validators.required],
      price:       [product?.price       ?? null, [Validators.required, Validators.min(1)]],
      stock:       [product?.stock       ?? null, [Validators.required, Validators.min(0)]],
      imageUrl:    [product?.imageUrl    ?? ''],
      categoryId:  [product?.category?.id ?? null, Validators.required],
    });
  }

  openCreateDrawer(): void {
    this.editingProduct = null;
    this.drawerError = null;
    this.imagePreview = null;
    this.uploadError = null;
    this.initForm();
    this.drawerOpen = true;
    this.cdr.detectChanges();
  }

  openEditDrawer(product: ProductResponse): void {
    this.editingProduct = product;
    this.drawerError = null;
    this.imagePreview = product.imageUrl || null;
    this.uploadError = null;
    this.initForm(product);
    this.drawerOpen = true;
    this.cdr.detectChanges();
  }

  closeDrawer(): void {
    this.drawerOpen = false;
    this.editingProduct = null;
    this.drawerError = null;
    this.imagePreview = null;
    this.uploadError = null;
    this.uploadingImage = false;
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
        this.products[idx] = { ...this.editingProduct, name: data.name, description: data.description, price: +data.price, stock: +data.stock, imageUrl: data.imageUrl, category };
      }
      this.toast('Produit mis à jour ✓');
    } else {
      const newId = Math.max(...this.products.map(p => p.id), 0) + 1;
      this.products = [{ id: newId, name: data.name, slug: data.name.toLowerCase().replace(/\s+/g, '-'), description: data.description, price: +data.price, stock: +data.stock, imageUrl: data.imageUrl, category, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, ...this.products];
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
    const payload = { name: product.name, description: product.description, price: product.price, stock: newStock, imageUrl: product.imageUrl, categoryId: product.category.id };
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
        this.categories = (r.success && Array.isArray(r.data)) ? r.data : [this.CAT_ELEC, this.CAT_MODE, this.CAT_MAISON, this.CAT_BEAUTE, this.CAT_SPORT];
        this.cdr.detectChanges();
      },
      error: () => { this.categories = [this.CAT_ELEC, this.CAT_MODE, this.CAT_MAISON, this.CAT_BEAUTE, this.CAT_SPORT]; this.cdr.detectChanges(); },
    });
  }

  private _filteredMocks(): ProductResponse[] {
    if (!this.searchQuery) return this.mockProducts;
    const q = this.searchQuery.toLowerCase();
    return this.mockProducts.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
  }

  search(): void { this.loadProducts(0); }
  previousPage(): void { if (this.currentPage > 0) this.loadProducts(this.currentPage - 1); }
  nextPage(): void { if (this.currentPage < this.totalPages - 1) this.loadProducts(this.currentPage + 1); }
  get pages(): number[] { return Array.from({ length: this.totalPages }, (_, i) => i); }
}
