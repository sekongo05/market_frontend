import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
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

@Component({
  selector: 'app-manager',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ReactiveFormsModule],
  templateUrl: './manager.component.html',
  styleUrls: ['./manager.component.css'],
})
export class ManagerComponent implements OnInit {

  // ── Data ─────────────────────────────────────────────────────────────────
  products: ProductResponse[] = [];
  categories: CategoryResponse[] = [];
  loading = false;
  error: string | null = null;
  currentPage = 0;
  pageSize = 10;
  totalPages = 0;
  searchQuery = '';

  // ── Stats ─────────────────────────────────────────────────────────────────
  totalProducts = 0;
  lowStockCount = 0;
  outOfStockCount = 0;

  // ── Modal ─────────────────────────────────────────────────────────────────
  showModal = false;
  editingProduct: ProductResponse | null = null;
  modalLoading = false;
  modalError: string | null = null;
  modalSuccess: string | null = null;
  productForm!: FormGroup;

  // ── Image upload ──────────────────────────────────────────────────────────
  imagePreview: string | null = null;
  uploadingImage = false;
  uploadError: string | null = null;
  dragOver = false;

  private readonly CAT_MONTRES  = { id: 1, name: 'Montres',           slug: 'montres',  description: '', imageUrl: '', active: true, createdAt: '' };
  private readonly CAT_BAGUES   = { id: 2, name: 'Bagues',            slug: 'bagues',   description: '', imageUrl: '', active: true, createdAt: '' };
  private readonly CAT_COLLIERS = { id: 3, name: 'Colliers',          slug: 'colliers', description: '', imageUrl: '', active: true, createdAt: '' };
  private readonly CAT_BRACE    = { id: 4, name: 'Bracelets',         slug: 'bracelets',description: '', imageUrl: '', active: true, createdAt: '' };
  private readonly CAT_BOUCLES  = { id: 5, name: "Boucles d'oreilles",slug: 'boucles',  description: '', imageUrl: '', active: true, createdAt: '' };

  private readonly mockProducts: ProductResponse[] = [
    { id: 1,  name: 'Royal Oak Chronographe',   slug: 'royal-oak-chrono',        description: "Montre iconique en acier inoxydable, cadran bleu, mouvement automatique Swiss Made.", price: 8500000,  stock: 3, imageUrl: 'https://images.unsplash.com/photo-1548169874-53e85f753f1e?w=400&q=80', category: this.CAT_MONTRES,  active: true, createdAt: '', updatedAt: '' },
    { id: 2,  name: 'Submariner Date',           slug: 'submariner-date',         description: "Montre de plongée légendaire, boîtier Oystersteel, lunette céramique noire.",        price: 12000000, stock: 2, imageUrl: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=400&q=80', category: this.CAT_MONTRES,  active: true, createdAt: '', updatedAt: '' },
    { id: 3,  name: 'Bague Solitaire Diamant',   slug: 'bague-solitaire',         description: "Bague en or blanc 18 carats sertie d'un diamant brillant de 1.5 ct.",                price: 5500000,  stock: 5, imageUrl: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400&q=80', category: this.CAT_BAGUES,   active: true, createdAt: '', updatedAt: '' },
    { id: 4,  name: "Collier Perles d'Akoya",    slug: 'collier-perles-akoya',    description: "Collier de perles d'Akoya du Japon, fermoir en or jaune 18 carats.",                price: 3200000,  stock: 0, imageUrl: 'https://images.unsplash.com/photo-1599459183200-59c7687a0c70?w=400&q=80', category: this.CAT_COLLIERS, active: true, createdAt: '', updatedAt: '' },
    { id: 5,  name: 'Santos de Cartier',         slug: 'santos-cartier',          description: 'Montre emblématique aux lignes carrées et vis apparentes.',                          price: 9800000,  stock: 2, imageUrl: 'https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=400&q=80', category: this.CAT_MONTRES,  active: true, createdAt: '', updatedAt: '' },
    { id: 6,  name: 'Bracelet Jonc Or 18K',      slug: 'bracelet-jonc-or',        description: 'Bracelet jonc rigide en or jaune 18 carats. Finition polie.',                        price: 2800000,  stock: 6, imageUrl: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=400&q=80', category: this.CAT_BRACE,    active: true, createdAt: '', updatedAt: '' },
    { id: 7,  name: 'Speedmaster Moonwatch',     slug: 'speedmaster-moonwatch',   description: 'La montre des astronautes. Chronographe légendaire.',                               price: 7200000,  stock: 3, imageUrl: 'https://images.unsplash.com/photo-1612817159949-195b6eb9e31a?w=400&q=80', category: this.CAT_MONTRES,  active: true, createdAt: '', updatedAt: '' },
    { id: 8,  name: 'Boucles Émeraude & Or',     slug: 'boucles-emeraude-or',     description: "Boucles d'oreilles en or blanc 18 carats serties d'émeraudes colombiennes.",        price: 4100000,  stock: 1, imageUrl: 'https://images.unsplash.com/photo-1630019852942-f89202989a59?w=400&q=80', category: this.CAT_BOUCLES,  active: true, createdAt: '', updatedAt: '' },
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

  // ── Stats helpers ─────────────────────────────────────────────────────────

  private _computeStats(): void {
    this.totalProducts = this.products.length;
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

  // ── Product CRUD ──────────────────────────────────────────────────────────

  private initForm(product?: ProductResponse): void {
    this.productForm = this.fb.group({
      name:        [product?.name        ?? '', Validators.required],
      description: [product?.description ?? '', Validators.required],
      price:       [product?.price       ?? null, [Validators.required, Validators.min(1)]],
      stock:       [product?.stock       ?? null, [Validators.required, Validators.min(0)]],
      imageUrl:    [product?.imageUrl    ?? '', Validators.required],
      categoryId:  [product?.category?.id ?? null, Validators.required],
    });
  }

  openCreateModal(): void {
    this.editingProduct = null;
    this.modalError = null; this.modalSuccess = null;
    this.imagePreview = null; this.uploadError = null;
    this.initForm();
    this.showModal = true;
    this.cdr.detectChanges();
  }

  openEditModal(product: ProductResponse): void {
    this.editingProduct = product;
    this.modalError = null; this.modalSuccess = null;
    this.imagePreview = product.imageUrl || null; this.uploadError = null;
    this.initForm(product);
    this.showModal = true;
    this.cdr.detectChanges();
  }

  closeModal(): void {
    this.showModal = false;
    this.editingProduct = null;
    this.modalError = null; this.modalSuccess = null;
    this.imagePreview = null; this.uploadError = null;
    this.uploadingImage = false;
    this.cdr.detectChanges();
  }

  saveProduct(): void {
    if (this.productForm.invalid) return;
    this.modalLoading = true;
    this.modalError = null;
    const data = this.productForm.value;
    const req$ = this.editingProduct
      ? this.productService.updateProduct(this.editingProduct.id, data)
      : this.productService.createProduct(data);
    req$.subscribe({
      next: (r) => {
        if (r.success) {
          this.modalSuccess = this.editingProduct ? 'Produit mis à jour' : 'Produit ajouté';
          this.loadProducts(this.currentPage);
          setTimeout(() => this.closeModal(), 1200);
        } else {
          this._applyLocalSave(data);
        }
        this.modalLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this._applyLocalSave(data);
        this.modalLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private _applyLocalSave(data: any): void {
    const category = this.categories.find(c => c.id === +data.categoryId) ?? this.categories[0];
    if (this.editingProduct) {
      const idx = this.products.findIndex(p => p.id === this.editingProduct!.id);
      if (idx !== -1) {
        this.products = [...this.products];
        this.products[idx] = {
          ...this.editingProduct,
          name: data.name,
          description: data.description,
          price: +data.price,
          stock: +data.stock,
          imageUrl: data.imageUrl,
          category,
        };
      }
      this.modalSuccess = 'Produit mis à jour';
    } else {
      const newId = Math.max(...this.products.map(p => p.id), 0) + 1;
      const newProduct: ProductResponse = {
        id: newId,
        name: data.name,
        slug: data.name.toLowerCase().replace(/\s+/g, '-'),
        description: data.description,
        price: +data.price,
        stock: +data.stock,
        imageUrl: data.imageUrl,
        category,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.products = [newProduct, ...this.products];
      this.modalSuccess = 'Produit ajouté';
    }
    this._computeStats();
    setTimeout(() => this.closeModal(), 1200);
  }

  deleteProduct(product: ProductResponse): void {
    if (!confirm(`Supprimer "${product.name}" ?`)) return;
    this.productService.deleteProduct(product.id).subscribe({
      next: (r) => {
        if (r.success) this.loadProducts(this.currentPage);
        else this._applyLocalDelete(product.id);
        this.cdr.detectChanges();
      },
      error: () => { this._applyLocalDelete(product.id); this.cdr.detectChanges(); },
    });
  }

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

  private _uploadFile(file: File): void {
    if (!file.type.startsWith('image/')) { this.uploadError = 'Seules les images sont acceptées'; this.cdr.detectChanges(); return; }
    if (file.size > 10 * 1024 * 1024) { this.uploadError = 'Fichier trop lourd — max 10 Mo'; this.cdr.detectChanges(); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const localUrl = e.target?.result as string;
      // Set preview + form immediately so the form is valid right away
      this.imagePreview = localUrl;
      this.productForm.patchValue({ imageUrl: localUrl });
      this.uploadingImage = true;
      this.uploadError = null;
      this.cdr.detectChanges();
      // Try to upload to server; replace local URL with server URL if it succeeds
      this.uploadService.uploadProductImage(file).subscribe({
        next: (url) => {
          this.productForm.patchValue({ imageUrl: url });
          this.imagePreview = url;
          this.uploadingImage = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.uploadingImage = false;
          this.cdr.detectChanges();
        },
      });
    };
    reader.readAsDataURL(file);
  }

  clearImage(): void { this.imagePreview = null; this.productForm.patchValue({ imageUrl: '' }); this.uploadError = null; this.cdr.detectChanges(); }

  // ── Catalogue load ────────────────────────────────────────────────────────

  loadProducts(page = 0): void {
    this.loading = true; this.error = null;
    const params: GetProductsParams = { page, size: this.pageSize };
    if (this.searchQuery) params.search = this.searchQuery;
    this.productService.getProducts(params).subscribe({
      next: (r) => {
        if (r.success) {
          const pg = r.data as PageResponse<ProductResponse>;
          this.products = pg.content.length > 0 ? pg.content : this._filteredMocks();
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
        this.categories = (r.success && Array.isArray(r.data)) ? r.data
          : [this.CAT_MONTRES, this.CAT_BAGUES, this.CAT_COLLIERS, this.CAT_BRACE, this.CAT_BOUCLES];
        this.cdr.detectChanges();
      },
      error: () => { this.categories = [this.CAT_MONTRES, this.CAT_BAGUES, this.CAT_COLLIERS, this.CAT_BRACE, this.CAT_BOUCLES]; this.cdr.detectChanges(); },
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
