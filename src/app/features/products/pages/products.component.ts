import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProductService } from '../../../core/services/product.service';
import { CategoryService } from '../../../core/services/category.service';
import { AuthService } from '../../../core/services/auth.service';
import { CartService } from '../../../core/services/cart.service';
import { UploadService } from '../../../core/services/upload.service';
import { ProductResponse, GetProductsParams } from '../../../core/models/product.models';
import { CategoryResponse } from '../../../core/models/category.models';
import { PageResponse } from '../../../core/models/common.models';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ReactiveFormsModule],
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.css'],
})
export class ProductsComponent implements OnInit {
  products: ProductResponse[] = [];
  categories: CategoryResponse[] = [];
  loading = false;
  error: string | null = null;
  currentPage = 0;
  pageSize = 48;
  totalPages = 0;
  searchQuery = '';

  // Modal state
  showModal = false;
  editingProduct: ProductResponse | null = null;
  modalLoading = false;
  modalError: string | null = null;
  modalSuccess: string | null = null;
  productForm!: FormGroup;

  private readonly CAT_ELEC   = { id: 1, name: 'Électronique',    slug: 'electronique',     description: 'Smartphones, ordinateurs, accessoires tech', imageUrl: '', active: true, createdAt: '' };
  private readonly CAT_MODE   = { id: 2, name: 'Mode & Vêtements', slug: 'mode-vetements',   description: 'Vêtements, chaussures, accessoires de mode',  imageUrl: '', active: true, createdAt: '' };
  private readonly CAT_MAISON = { id: 3, name: 'Maison & Cuisine',  slug: 'maison-cuisine',   description: 'Électroménager, décoration, ustensiles',       imageUrl: '', active: true, createdAt: '' };
  private readonly CAT_BEAUTE = { id: 4, name: 'Beauté & Santé',    slug: 'beaute-sante',     description: 'Cosmétiques, soins, produits de santé',        imageUrl: '', active: true, createdAt: '' };
  private readonly CAT_SPORT  = { id: 5, name: 'Sports & Loisirs',  slug: 'sports-loisirs',   description: 'Équipements sportifs, jeux, loisirs',          imageUrl: '', active: true, createdAt: '' };

  private readonly mockProducts: ProductResponse[] = [
    { id: 1,  name: 'iPhone 15 Pro',          slug: 'iphone-15-pro',         description: 'Smartphone Apple iPhone 15 Pro 256Go, puce A17 Pro, appareil photo 48MP.',         price: 650000,  stock: 15, imageUrl: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=600&q=80', category: this.CAT_ELEC,   active: true, createdAt: '', updatedAt: '' },
    { id: 2,  name: 'Samsung Galaxy S24',     slug: 'samsung-galaxy-s24',    description: 'Smartphone Samsung Galaxy S24 128Go, écran Dynamic AMOLED 6.2 pouces.',           price: 450000,  stock: 20, imageUrl: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=600&q=80', category: this.CAT_ELEC,   active: true, createdAt: '', updatedAt: '' },
    { id: 3,  name: 'MacBook Air M2',         slug: 'macbook-air-m2',        description: 'Ordinateur portable Apple MacBook Air 13 pouces, puce M2, 8Go RAM, 256Go SSD.',   price: 1200000, stock: 8,  imageUrl: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=600&q=80', category: this.CAT_ELEC,   active: true, createdAt: '', updatedAt: '' },
    { id: 4,  name: 'Sac à main Cuir',        slug: 'sac-main-cuir',         description: 'Sac à main en cuir véritable, design élégant, compartiments multiples.',           price: 55000,   stock: 18, imageUrl: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80', category: this.CAT_MODE,   active: true, createdAt: '', updatedAt: '' },
    { id: 5,  name: 'Robe Wax Traditionnelle',slug: 'robe-wax',              description: 'Robe en tissu wax 100% coton, motifs traditionnels africains, taille ajustable.',  price: 25000,   stock: 30, imageUrl: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&q=80', category: this.CAT_MODE,   active: true, createdAt: '', updatedAt: '' },
    { id: 6,  name: 'Climatiseur Hisense',    slug: 'clim-hisense',          description: 'Climatiseur split Hisense 1.5 CV, fonction froid/chaud, économique en énergie.',  price: 280000,  stock: 10, imageUrl: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&q=80', category: this.CAT_MAISON, active: true, createdAt: '', updatedAt: '' },
    { id: 7,  name: 'Fer à repasser Philips', slug: 'fer-philips',           description: 'Fer à repasser vapeur Philips 2400W, semelle en céramique, bac 350ml.',           price: 22000,   stock: 35, imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80', category: this.CAT_MAISON, active: true, createdAt: '', updatedAt: '' },
    { id: 8,  name: 'Crème Hydratante Nivea', slug: 'creme-nivea',           description: 'Crème hydratante corps Nivea 400ml, formule enrichie en aloe vera.',               price: 3500,    stock: 50, imageUrl: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=600&q=80', category: this.CAT_BEAUTE, active: true, createdAt: '', updatedAt: '' },
    { id: 9,  name: 'Parfum Dior Sauvage',    slug: 'parfum-dior',           description: 'Eau de toilette Dior Sauvage 100ml, fragrance boisée et fraîche pour homme.',    price: 85000,   stock: 12, imageUrl: 'https://images.unsplash.com/photo-1541643600914-78b084683702?w=600&q=80', category: this.CAT_BEAUTE, active: true, createdAt: '', updatedAt: '' },
    { id: 10, name: 'Vélo de Sport',          slug: 'velo-sport',            description: 'Vélo de sport tout terrain 21 vitesses, cadre aluminium, freins à disque.',       price: 120000,  stock: 7,  imageUrl: 'https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=600&q=80', category: this.CAT_SPORT,  active: true, createdAt: '', updatedAt: '' },
    { id: 11, name: 'Ballon de Football Nike',slug: 'ballon-nike',           description: 'Ballon de football officiel Nike Strike, taille 5, certifié FIFA.',              price: 18000,   stock: 25, imageUrl: 'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=600&q=80', category: this.CAT_SPORT,  active: true, createdAt: '', updatedAt: '' },
    { id: 12, name: 'Tablette iPad 10',       slug: 'ipad-10',               description: 'Tablette Apple iPad 10e génération 64Go WiFi, écran 10.9 pouces Liquid Retina.', price: 380000,  stock: 12, imageUrl: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&q=80', category: this.CAT_ELEC,   active: true, createdAt: '', updatedAt: '' },
  ];

  // Category filter
  selectedCategoryId: number | null = null;

  // Tracks product ids that were just added (for button feedback)
  addedIds = new Set<number>();

  // Image upload state
  imagePreview: string | null = null;
  uploadingImage = false;
  uploadError: string | null = null;
  dragOver = false;

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private authService: AuthService,
    private cartService: CartService,
    private uploadService: UploadService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {}

  addToCart(product: ProductResponse): void {
    this.cartService.addToCart({
      productId: product.id,
      productName: product.name,
      price: product.price,
      quantity: 1,
      imageUrl: product.imageUrl,
    });
    // Brief green feedback on the button
    this.addedIds.add(product.id);
    this.cdr.detectChanges();
    setTimeout(() => {
      this.addedIds.delete(product.id);
      this.cdr.detectChanges();
    }, 1500);
  }

  ngOnInit(): void {
    this.initForm();
    this.loadProducts();
    this.loadCategories();
  }

  get isManager(): boolean {
    const user = this.authService.getCurrentUser();
    return user?.role === 'ADMIN' || user?.role === 'MANAGER';
  }

  // ─── Product form ───────────────────────────────────────────────────────────

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
    this.modalError = null;
    this.modalSuccess = null;
    this.imagePreview = null;
    this.uploadError = null;
    this.initForm();
    this.showModal = true;
    this.cdr.detectChanges();
  }

  openEditModal(product: ProductResponse): void {
    this.editingProduct = product;
    this.modalError = null;
    this.modalSuccess = null;
    this.imagePreview = product.imageUrl || null;
    this.uploadError = null;
    this.initForm(product);
    this.showModal = true;
    this.cdr.detectChanges();
  }

  closeModal(): void {
    this.showModal = false;
    this.editingProduct = null;
    this.modalError = null;
    this.modalSuccess = null;
    this.imagePreview = null;
    this.uploadError = null;
    this.uploadingImage = false;
    this.cdr.detectChanges();
  }

  // ─── Image upload ────────────────────────────────────────────────────────────

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) this._uploadFile(file);
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
    if (!this._isImageFile(file)) {
      this.uploadError = 'Format non supporté — JPEG, PNG, WEBP, GIF, BMP, TIFF, SVG, AVIF, HEIC';
      this.cdr.detectChanges();
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.uploadError = 'Fichier trop lourd — maximum 10 Mo';
      this.cdr.detectChanges();
      return;
    }

    // Immediate local preview
    const reader = new FileReader();
    reader.onload = (e) => {
      this.imagePreview = e.target?.result as string;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);

    // Upload to server
    this.uploadingImage = true;
    this.uploadError = null;
    this.cdr.detectChanges();

    this.uploadService.uploadProductImage(file).subscribe({
      next: (url) => {
        this.productForm.patchValue({ imageUrl: url });
        this.imagePreview = url;
        this.uploadingImage = false;
        this.cdr.detectChanges();
      },
      error: () => {
        // Keep local preview; warn but allow saving with preview URL
        this.uploadError = 'Serveur indisponible — l\'image sera utilisée localement';
        this.uploadingImage = false;
        // Still set the local data-url so the form is valid
        if (this.imagePreview) {
          this.productForm.patchValue({ imageUrl: this.imagePreview });
        }
        this.cdr.detectChanges();
      },
    });
  }

  clearImage(): void {
    this.imagePreview = null;
    this.productForm.patchValue({ imageUrl: '' });
    this.uploadError = null;
    this.cdr.detectChanges();
  }

  saveProduct(): void {
    if (this.productForm.invalid) return;
    this.modalLoading = true;
    this.modalError = null;

    const data = this.productForm.value;

    const request$ = this.editingProduct
      ? this.productService.updateProduct(this.editingProduct.id, data)
      : this.productService.createProduct(data);

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

    this.productService.getProducts(params).subscribe({
      next: (response) => {
        if (response.success) {
          const pageResponse = response.data as PageResponse<ProductResponse>;
          if (pageResponse.content.length > 0) {
            this.products = pageResponse.content;
            this.totalPages = pageResponse.totalPages;
          } else {
            this.products = this.getFilteredMocks();
            this.totalPages = 1;
          }
          this.currentPage = page;
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.products = this.getFilteredMocks();
        this.totalPages = 1;
        this.currentPage = 0;
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
        } else {
          this.categories = [
            this.CAT_ELEC, this.CAT_MODE, this.CAT_MAISON,
            this.CAT_BEAUTE, this.CAT_SPORT,
          ];
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.categories = [
          this.CAT_ELEC, this.CAT_MODE, this.CAT_MAISON,
          this.CAT_BEAUTE, this.CAT_SPORT,
        ];
        this.cdr.detectChanges();
      },
    });
  }

  private getFilteredMocks(): ProductResponse[] {
    let mocks = this.mockProducts;
    if (this.selectedCategoryId) mocks = mocks.filter(p => p.category.id === this.selectedCategoryId);
    if (!this.searchQuery) return mocks;
    const q = this.searchQuery.toLowerCase();
    return mocks.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
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

  previousPage(): void {
    if (this.currentPage > 0) this.loadProducts(this.currentPage - 1);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) this.loadProducts(this.currentPage + 1);
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i);
  }
}
