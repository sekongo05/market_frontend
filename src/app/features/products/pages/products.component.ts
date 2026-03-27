import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../../core/services/product.service';
import { ProductResponse, GetProductsParams } from '../../../core/models/product.models';
import { PageResponse } from '../../../core/models/common.models';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.css'],
})
export class ProductsComponent implements OnInit {
  products: ProductResponse[] = [];
  loading = false;
  error: string | null = null;
  currentPage = 0;
  pageSize = 12;
  totalPages = 0;
  searchQuery = '';

  private readonly CAT_MONTRES  = { id: 1, name: 'Montres',           slug: 'montres',  description: '', imageUrl: '', active: true, createdAt: '' };
  private readonly CAT_BAGUES   = { id: 2, name: 'Bagues',            slug: 'bagues',   description: '', imageUrl: '', active: true, createdAt: '' };
  private readonly CAT_COLLIERS = { id: 3, name: 'Colliers',          slug: 'colliers', description: '', imageUrl: '', active: true, createdAt: '' };
  private readonly CAT_BRACE    = { id: 4, name: 'Bracelets',         slug: 'bracelets',description: '', imageUrl: '', active: true, createdAt: '' };
  private readonly CAT_BOUCLES  = { id: 5, name: "Boucles d'oreilles",slug: 'boucles',  description: '', imageUrl: '', active: true, createdAt: '' };

  private readonly mockProducts: ProductResponse[] = [
    { id: 1,  name: 'Royal Oak Chronographe',   slug: 'royal-oak-chrono',        description: "Montre iconique en acier inoxydable, cadran bleu, mouvement automatique Swiss Made. Un chef-d'œuvre de l'horlogerie moderne.", price: 8500000,  stock: 3, imageUrl: 'https://images.unsplash.com/photo-1548169874-53e85f753f1e?w=600&q=80',  category: this.CAT_MONTRES,  active: true, createdAt: '', updatedAt: '' },
    { id: 2,  name: 'Submariner Date',           slug: 'submariner-date',         description: "Montre de plongée légendaire, boîtier Oystersteel, lunette céramique noire. Étanche jusqu'à 300 mètres.",                        price: 12000000, stock: 2, imageUrl: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=600&q=80',  category: this.CAT_MONTRES,  active: true, createdAt: '', updatedAt: '' },
    { id: 3,  name: 'Bague Solitaire Diamant',   slug: 'bague-solitaire',         description: "Bague en or blanc 18 carats sertie d'un diamant brillant de 1.5 ct. Certificat GIA inclus.",                                    price: 5500000,  stock: 5, imageUrl: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600&q=80',  category: this.CAT_BAGUES,   active: true, createdAt: '', updatedAt: '' },
    { id: 4,  name: "Collier Perles d'Akoya",    slug: 'collier-perles-akoya',    description: "Collier de perles d'Akoya du Japon, fermoir en or jaune 18 carats. Éclat nacré exceptionnel.",                                  price: 3200000,  stock: 4, imageUrl: 'https://images.unsplash.com/photo-1599459183200-59c7687a0c70?w=600&q=80',  category: this.CAT_COLLIERS, active: true, createdAt: '', updatedAt: '' },
    { id: 5,  name: 'Santos de Cartier',         slug: 'santos-cartier',          description: 'Montre emblématique aux lignes carrées et vis apparentes. Bracelet intégré en acier et or rose.',                                 price: 9800000,  stock: 2, imageUrl: 'https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=600&q=80',  category: this.CAT_MONTRES,  active: true, createdAt: '', updatedAt: '' },
    { id: 6,  name: 'Bracelet Jonc Or 18K',      slug: 'bracelet-jonc-or',        description: 'Bracelet jonc rigide en or jaune 18 carats. Finition polie, design intemporel et élégant.',                                      price: 2800000,  stock: 6, imageUrl: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=600&q=80',  category: this.CAT_BRACE,    active: true, createdAt: '', updatedAt: '' },
    { id: 7,  name: 'Speedmaster Moonwatch',     slug: 'speedmaster-moonwatch',   description: 'La montre des astronautes. Chronographe légendaire, verre saphir, mouvement manuel certifié COSC.',                             price: 7200000,  stock: 3, imageUrl: 'https://images.unsplash.com/photo-1612817159949-195b6eb9e31a?w=600&q=80',  category: this.CAT_MONTRES,  active: true, createdAt: '', updatedAt: '' },
    { id: 8,  name: 'Boucles Émeraude & Or',     slug: 'boucles-emeraude-or',     description: "Boucles d'oreilles en or blanc 18 carats serties d'émeraudes colombiennes et diamants pavés.",                                  price: 4100000,  stock: 4, imageUrl: 'https://images.unsplash.com/photo-1630019852942-f89202989a59?w=600&q=80',  category: this.CAT_BOUCLES,  active: true, createdAt: '', updatedAt: '' },
    { id: 9,  name: 'Lange & Söhne Datograph',   slug: 'lange-datograph',         description: "Chronographe allemand d'exception, manufacture A. Lange & Söhne. Mouvement Flyback, boîtier platine.",                          price: 45000000, stock: 1, imageUrl: 'https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?w=600&q=80',  category: this.CAT_MONTRES,  active: true, createdAt: '', updatedAt: '' },
    { id: 10, name: 'Collier Diamants Rivière',  slug: 'collier-diamants-riviere',description: "Rivière de diamants en or blanc 18 carats, 35 brillants d'un total de 5 carats. Pièce de haute joaillerie.",                   price: 18500000, stock: 1, imageUrl: 'https://images.unsplash.com/photo-1601121141461-9d6647bef0a1?w=600&q=80',  category: this.CAT_COLLIERS, active: true, createdAt: '', updatedAt: '' },
    { id: 11, name: 'Breitling Navitimer',        slug: 'breitling-navitimer',     description: 'Chronographe de pilote iconique, règle à calcul intégrée, mouvement automatique COSC. Cadran anthracite.',                      price: 6800000,  stock: 3, imageUrl: 'https://images.unsplash.com/photo-1526045431048-f857369baa09?w=600&q=80',  category: this.CAT_MONTRES,  active: true, createdAt: '', updatedAt: '' },
    { id: 12, name: 'Bague Rubis & Diamants',    slug: 'bague-rubis-diamants',    description: "Bague cocktail en or rose 18 carats, rubis de Birmanie 3 ct entouré de diamants pavés. Certificat d'origine.",                  price: 8900000,  stock: 2, imageUrl: 'https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=600&q=80',  category: this.CAT_BAGUES,   active: true, createdAt: '', updatedAt: '' },
  ];

  constructor(private productService: ProductService) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(page: number = 0): void {
    this.loading = true;
    this.error = null;

    const params: GetProductsParams = {
      page,
      size: this.pageSize,
    };

    if (this.searchQuery) {
      params.search = this.searchQuery;
    }

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
      },
      error: () => {
        this.products = this.getFilteredMocks();
        this.totalPages = 1;
        this.currentPage = 0;
        this.loading = false;
      },
    });
  }

  private getFilteredMocks(): ProductResponse[] {
    if (!this.searchQuery) return this.mockProducts;
    const q = this.searchQuery.toLowerCase();
    return this.mockProducts.filter((p: ProductResponse) =>
      p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
    );
  }

  search(): void {
    this.loadProducts(0);
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.loadProducts(this.currentPage - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.loadProducts(this.currentPage + 1);
    }
  }

  get pages(): number[] {
    const pages: number[] = [];
    for (let i = 0; i < this.totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }
}
